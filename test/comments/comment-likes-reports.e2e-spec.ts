// Thích bình luận (lượt thích, likedByMe, thứ tự Nổi bật, hạn mức) và báo cáo bình luận vi phạm
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { commentLikes, commentReports, comments, stories } from '@/infra/database/schema'
import { LIKE_RATE_LIMIT } from '@/modules/comments/comments.constants'
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
const like = (accessToken: string, id: string) =>
  auth(http().put(`/v1/comments/${id}/like`), accessToken)
const unlike = (accessToken: string, id: string) =>
  auth(http().delete(`/v1/comments/${id}/like`), accessToken)
const report = (accessToken: string, id: string, body: object) =>
  auth(http().post(`/v1/comments/${id}/reports`), accessToken).send(body)
type CommentBody = { id: string; content: string; likeCount: number; likedByMe: boolean }
const roots = async (slug: string, query = '', accessToken?: string) =>
  (await auth(http().get(`/v1/stories/${slug}/comments${query}`), accessToken).expect(200)).body
    .data as CommentBody[]
/** Bình luận ghi thẳng vào DB (không đụng hạn mức viết bình luận) */
const insertComment = async (storyId: string, userId: string, content: string) => {
  const [row] = await db
    .insert(comments)
    .values({ storyId, userId, content })
    .returning({ id: comments.id })
  return row!.id
}

describe('thích bình luận', () => {
  it('thích, thích lại, bỏ thích: likeCount, likedByMe theo người xem; thứ tự Nổi bật; xóa bình luận', async () => {
    const author = await registerUser(app)
    const fan = await verifiedUser(app)
    const other = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const first = await insertComment(story.id, author.id, 'Thứ nhất')
    await db
      .update(comments)
      .set({ createdAt: new Date(Date.UTC(2026, 0, 1)) })
      .where(eq(comments.id, first))
    await insertComment(story.id, author.id, 'Thứ hai')

    await like(fan.accessToken, first).expect(204)
    await like(fan.accessToken, first).expect(204)
    const forFan = await roots(story.slug, '?sort=top', fan.accessToken)
    expect(forFan.map((c) => [c.content, c.likeCount, c.likedByMe])).toEqual([
      ['Thứ nhất', 1, true],
      ['Thứ hai', 0, false],
    ])
    expect((await roots(story.slug, '', other.accessToken)).map((c) => c.likedByMe)).toEqual([
      false,
      false,
    ])
    expect((await roots(story.slug)).find((c) => c.id === first)!.likedByMe).toBe(false)

    await unlike(fan.accessToken, first).expect(204)
    await unlike(fan.accessToken, first).expect(204)
    expect((await roots(story.slug, '?sort=top', fan.accessToken))[0]).toMatchObject({
      content: 'Thứ hai',
      likeCount: 0,
    })

    // Xóa bình luận đang có lượt thích: lượt thích mất theo, không lỗi
    await like(fan.accessToken, first).expect(204)
    await db.delete(comments).where(eq(comments.id, first))
    expect(await db.select().from(commentLikes).where(eq(commentLikes.commentId, first))).toEqual(
      [],
    )
  })

  it('tự thích → own_comment_like; chưa xác nhận email → 403; không có → 404; truyện bị ẩn → 409', async () => {
    const author = await verifiedUser(app)
    const unverified = await registerUser(app)
    const fan = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const id = await insertComment(story.id, author.id, 'Bình luận')
    expect((await like(author.accessToken, id).expect(400)).body.error.code).toBe(
      'own_comment_like',
    )
    expect((await like(unverified.accessToken, id).expect(403)).body.error.code).toBe(
      'email_not_verified',
    )
    await like(fan.accessToken, crypto.randomUUID()).expect(404)
    await db.update(stories).set({ visibility: 'draft' }).where(eq(stories.id, story.id))
    expect((await like(fan.accessToken, id).expect(409)).body.error.code).toBe('story_not_public')
  })

  it('tối đa 300 lượt thích mới / giờ; thích lại, bỏ thích vẫn được', async () => {
    const author = await registerUser(app)
    const fan = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const liked = await insertComment(story.id, author.id, 'Đã thích')
    const fresh = await insertComment(story.id, author.id, 'Chưa thích')
    await like(fan.accessToken, liked).expect(204)
    const rateLimit = app.get(RateLimitService)
    for (let i = 1; i < LIKE_RATE_LIMIT.limit; i++) {
      await rateLimit.consume(`comments:like:user:${fan.id}`, LIKE_RATE_LIMIT)
    }
    expect((await like(fan.accessToken, fresh).expect(429)).body.error.code).toBe('rate_limited')
    // Thích lại bình luận đã thích không tính lượt mới
    await like(fan.accessToken, liked).expect(204)
    await unlike(fan.accessToken, liked).expect(204)

    // Bỏ thích rồi thích lại là lượt thích mới
    await like(fan.accessToken, liked).expect(429)
  })
})

describe('báo cáo bình luận', () => {
  it('báo cáo lưu nội dung lúc báo; báo lại cập nhật, không thêm dòng; sửa bình luận không đổi snapshot', async () => {
    const author = await verifiedUser(app)
    const reporter = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const id = await insertComment(story.id, author.id, 'Nội dung xấu')
    await report(reporter.accessToken, id, { reason: 'spam' }).expect(204)
    await auth(http().patch(`/v1/comments/${id}`), author.accessToken)
      .send({ content: 'Đã sửa cho đẹp' })
      .expect(200)
    const rows = async () =>
      db
        .select({
          reason: commentReports.reason,
          note: commentReports.note,
          status: commentReports.status,
          contentSnapshot: commentReports.contentSnapshot,
        })
        .from(commentReports)
        .where(eq(commentReports.commentId, id))
    expect(await rows()).toEqual([
      { reason: 'spam', note: '', status: 'open', contentSnapshot: 'Nội dung xấu' },
    ])
    await report(reporter.accessToken, id, { reason: 'other', note: '  Xúc phạm  ' }).expect(204)
    expect(await rows()).toEqual([
      { reason: 'other', note: 'Xúc phạm', status: 'open', contentSnapshot: 'Đã sửa cho đẹp' },
    ])
  })

  it('báo cáo của mình → own_comment_report; other thiếu ghi chú, lý do lạ → 400; truyện bị ẩn → 404', async () => {
    const author = await verifiedUser(app)
    const reporter = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const id = await insertComment(story.id, author.id, 'Bình luận')
    expect(
      (await report(author.accessToken, id, { reason: 'spam' }).expect(400)).body.error.code,
    ).toBe('own_comment_report')
    for (const body of [
      { reason: 'other' },
      { reason: 'other', note: '   ' },
      { reason: 'hate' },
    ]) {
      const res = await report(reporter.accessToken, id, body).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
    await db.update(stories).set({ visibility: 'draft' }).where(eq(stories.id, story.id))
    await report(reporter.accessToken, id, { reason: 'spam' }).expect(404)
  })

  it('báo cáo mới thứ 11 trong giờ → 429; báo lại bình luận đã báo vẫn được', async () => {
    const author = await registerUser(app)
    const reporter = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const ids: string[] = []
    for (let i = 0; i < 11; i++) ids.push(await insertComment(story.id, author.id, `Số ${i}`))
    for (const id of ids.slice(0, 10)) {
      await report(reporter.accessToken, id, { reason: 'spam' }).expect(204)
    }
    expect(
      (await report(reporter.accessToken, ids[10]!, { reason: 'spam' }).expect(429)).body.error
        .code,
    ).toBe('rate_limited')
    await report(reporter.accessToken, ids[0]!, { reason: 'offensive' }).expect(204)
  })
})
