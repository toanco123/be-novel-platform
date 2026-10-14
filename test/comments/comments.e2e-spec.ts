// Bình luận: viết (truyện / chương / trả lời), quyền, gửi lặp, hạn mức, danh sách, sửa, xóa, cascade
import type { NestExpressApplication } from '@nestjs/platform-express'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { chapters, comments, users } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { registerUser, verifiedUser } from '../helpers/auth'
import { createStory } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const auth = (req: request.Test, accessToken?: string) =>
  accessToken ? req.set('Authorization', `Bearer ${accessToken}`) : req
const post = (accessToken: string, slug: string, body: object) =>
  auth(http().post(`/v1/stories/${slug}/comments`), accessToken).send(body)
const remove = (accessToken: string, id: string) =>
  auth(http().delete(`/v1/comments/${id}`), accessToken)
type CommentBody = { id: string; content: string; replyCount: number; likeCount: number }
const list = async (slug: string, query = '', accessToken?: string) =>
  (await auth(http().get(`/v1/stories/${slug}/comments${query}`), accessToken).expect(200)).body
const contents = (body: { data: CommentBody[] }) => body.data.map((c) => c.content)

describe('viết bình luận', () => {
  it('bình luận truyện, bình luận chương nằm riêng; trả lời tăng replyCount; đủ trường', async () => {
    const reader = await verifiedUser(app, { displayName: 'Người đọc' })
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id, chapters: [{ number: 1 }] })
    const res = await post(reader.accessToken, story.slug, { content: '  Hay quá!  ' }).expect(201)
    expect(res.body.data).toEqual({
      id: expect.any(String),
      storySlug: story.slug,
      chapterNumber: null,
      user: { id: reader.id, displayName: 'Người đọc', avatarUrl: null },
      content: 'Hay quá!',
      createdAt: expect.any(String),
      parentId: null,
      replyCount: 0,
      likeCount: 0,
      likedByMe: false,
      editedAt: null,
      isAuthor: false,
    })
    await post(reader.accessToken, story.slug, { content: 'Chương 1 hay', chapter: 1 }).expect(201)
    await post(reader.accessToken, story.slug, {
      content: 'Trả lời',
      parentId: res.body.data.id,
    }).expect(201)

    const storyLevel = await list(story.slug)
    expect(contents(storyLevel)).toEqual(['Hay quá!'])
    expect(storyLevel.data[0].replyCount).toBe(1)
    expect(contents(await list(story.slug, '?chapter=1'))).toEqual(['Chương 1 hay'])
  })

  it('nhãn Tác giả: chủ truyện không bút danh → true; truyện có bút danh → false', async () => {
    const owner = await verifiedUser(app)
    const plain = await createStory(db, { ownerId: owner.id })
    const penned = await createStory(db, { ownerId: owner.id, authorName: 'Bút Danh' })
    const a = await post(owner.accessToken, plain.slug, { content: 'Cảm ơn mọi người' }).expect(201)
    const b = await post(owner.accessToken, penned.slug, { content: 'Cảm ơn mọi người' }).expect(
      201,
    )
    expect(a.body.data.isAuthor).toBe(true)
    expect(b.body.data.isAuthor).toBe(false)
  })

  it('quyền: chưa xác nhận email → 403; truyện nháp → 404 / 409; chương nháp → 404', async () => {
    const unverified = await registerUser(app)
    const reader = await verifiedUser(app)
    const owner = await verifiedUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [{ number: 1 }, { number: 2, status: 'draft' }],
    })
    const forbidden = await post(unverified.accessToken, story.slug, { content: 'x' }).expect(403)
    expect(forbidden.body.error.code).toBe('email_not_verified')
    await post(reader.accessToken, story.slug, { content: 'x', chapter: 2 }).expect(404)
    await post(reader.accessToken, story.slug, { content: 'x', chapter: 9 }).expect(404)

    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await post(reader.accessToken, draft.slug, { content: 'x' }).expect(404)
    const own = await post(owner.accessToken, draft.slug, { content: 'x' }).expect(409)
    expect(own.body.error.code).toBe('story_not_public')
  })

  it('trả lời: gốc đã xóa → parent_not_found; trả lời vào trả lời, khác chương → invalid_parent', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id, chapters: [{ number: 1 }] })
    const root = (await post(reader.accessToken, story.slug, { content: 'Gốc' }).expect(201)).body
      .data
    const reply = (
      await post(reader.accessToken, story.slug, { content: 'Trả lời', parentId: root.id }).expect(
        201,
      )
    ).body.data
    const nested = await post(reader.accessToken, story.slug, {
      content: 'Trả lời lồng',
      parentId: reply.id,
    }).expect(400)
    expect(nested.body.error.code).toBe('invalid_parent')
    const otherChapter = await post(reader.accessToken, story.slug, {
      content: 'Khác chương',
      chapter: 1,
      parentId: root.id,
    }).expect(400)
    expect(otherChapter.body.error.code).toBe('invalid_parent')

    await db.delete(comments).where(eq(comments.id, root.id))
    const gone = await post(reader.accessToken, story.slug, {
      content: 'Muộn rồi',
      parentId: root.id,
    }).expect(404)
    expect(gone.body.error.code).toBe('parent_not_found')
  })

  it('gửi lặp trong 10 phút → duplicate_comment; nội dung khác thì được', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await post(reader.accessToken, story.slug, { content: 'Một lần thôi' }).expect(201)
    const again = await post(reader.accessToken, story.slug, { content: 'Một lần thôi' }).expect(
      409,
    )
    expect(again.body.error.code).toBe('duplicate_comment')
    await post(reader.accessToken, story.slug, { content: 'Nội dung khác' }).expect(201)
  })

  it('hạn mức 3 / phút; gửi lặp, gửi sai chỗ không mất lượt', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await post(reader.accessToken, story.slug, { content: 'Một' }).expect(201)
    await post(reader.accessToken, story.slug, { content: 'Một' }).expect(409)
    await post(reader.accessToken, story.slug, { content: 'Sai', chapter: 99 }).expect(404)
    await post(reader.accessToken, story.slug, { content: 'Hai' }).expect(201)
    await post(reader.accessToken, story.slug, { content: 'Ba' }).expect(201)
    const res = await post(reader.accessToken, story.slug, { content: 'Bốn' }).expect(429)
    expect(res.body.error.code).toBe('rate_limited')
  })

  it('nội dung rỗng, quá 1000 ký tự, parentId sai dạng → 400', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    for (const body of [
      { content: '   ' },
      { content: 'x'.repeat(1001) },
      { content: 'x', parentId: 'abc' },
      { content: 'x', chapter: 0 },
    ]) {
      const res = await post(reader.accessToken, story.slug, body).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })
})

describe('đọc bình luận', () => {
  it('mới nhất / nhiều thích nhất; phân trang; khách xem được; truyện nháp → 404', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const ids: string[] = []
    for (const content of ['A', 'B', 'C']) {
      ids.push((await post(reader.accessToken, story.slug, { content }).expect(201)).body.data.id)
    }
    // Thứ tự thời gian rõ ràng và lượt thích để xếp "Nổi bật"
    for (const [index, id] of ids.entries()) {
      await db
        .update(comments)
        .set({ createdAt: new Date(Date.UTC(2026, 0, index + 1)), likeCount: [5, 1, 3][index]! })
        .where(eq(comments.id, id))
    }
    expect(contents(await list(story.slug))).toEqual(['C', 'B', 'A'])
    expect(contents(await list(story.slug, '?sort=top'))).toEqual(['A', 'C', 'B'])
    const page = await list(story.slug, '?page=2&pageSize=2')
    expect(contents(page)).toEqual(['A'])
    expect(page.meta).toMatchObject({ total: 3, page: 2, pageSize: 2, pageCount: 2 })

    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await http().get(`/v1/stories/${draft.slug}/comments`).expect(404)
    await http().get(`/v1/stories/${story.slug}/comments?sort=hot`).expect(400)
  })

  it('trả lời: cũ trước; id sai dạng → 400; không có → 404', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const root = (await post(reader.accessToken, story.slug, { content: 'Gốc' }).expect(201)).body
      .data
    for (const content of ['Một', 'Hai']) {
      await post(reader.accessToken, story.slug, { content, parentId: root.id }).expect(201)
    }
    const res = await http().get(`/v1/comments/${root.id}/replies`).expect(200)
    expect(res.body.data.map((c: CommentBody) => c.content)).toEqual(['Một', 'Hai'])
    await http().get('/v1/comments/abc/replies').expect(400)
    await http().get(`/v1/comments/${crypto.randomUUID()}/replies`).expect(404)
  })
})

describe('sửa, xóa', () => {
  it('sửa của mình → editedAt; gửi lại đúng nội dung thì không đổi; của người khác → 403', async () => {
    const reader = await verifiedUser(app)
    const other = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const id = (await post(reader.accessToken, story.slug, { content: 'Cũ' }).expect(201)).body.data
      .id
    const edit = (accessToken: string, content: string) =>
      auth(http().patch(`/v1/comments/${id}`), accessToken).send({ content })

    const same = await edit(reader.accessToken, 'Cũ').expect(200)
    expect(same.body.data.editedAt).toBeNull()
    const changed = await edit(reader.accessToken, 'Mới').expect(200)
    expect(changed.body.data).toMatchObject({ content: 'Mới', editedAt: expect.any(String) })
    expect((await edit(other.accessToken, 'Phá').expect(403)).body.error.code).toBe('forbidden')
  })

  it('người viết, chủ truyện xóa được (trả lời mất theo); người khác → 403', async () => {
    const reader = await verifiedUser(app)
    const other = await verifiedUser(app)
    const owner = await verifiedUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const root = (await post(reader.accessToken, story.slug, { content: 'Gốc' }).expect(201)).body
      .data
    const reply = (
      await post(other.accessToken, story.slug, { content: 'Trả lời', parentId: root.id }).expect(
        201,
      )
    ).body.data
    await remove(other.accessToken, root.id).expect(403)
    await remove(owner.accessToken, root.id).expect(204)
    expect(await db.select().from(comments).where(eq(comments.id, reply.id))).toEqual([])
    await remove(reader.accessToken, root.id).expect(404)

    const mine = (await post(reader.accessToken, story.slug, { content: 'Của tôi' }).expect(201))
      .body.data
    await remove(reader.accessToken, mine.id).expect(204)
  })

  it('xóa chương → bình luận của chương mất; xóa tài khoản → bình luận mất', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [{ number: 1 }, { number: 2 }],
    })
    await post(reader.accessToken, story.slug, { content: 'Chương 2', chapter: 2 }).expect(201)
    await post(reader.accessToken, story.slug, { content: 'Cả truyện' }).expect(201)
    await db.delete(chapters).where(and(eq(chapters.storyId, story.id), eq(chapters.number, 2)))
    expect(contents(await list(story.slug, '?chapter=2'))).toEqual([])
    await db.delete(users).where(eq(users.id, reader.id))
    expect(contents(await list(story.slug))).toEqual([])
  })
})
