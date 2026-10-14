// Lịch sử đọc: lưu chỗ đọc dở, danh sách, một truyện, xóa, gộp lịch sử lúc còn là khách
import type { NestExpressApplication } from '@nestjs/platform-express'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { readingHistory, stories, users } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { registerUser } from '../helpers/auth'
import { createStory, randomLetters } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const auth = (req: request.Test, accessToken: string) =>
  req.set('Authorization', `Bearer ${accessToken}`)
const save = (accessToken: string, slug: string, body: object) =>
  auth(http().put(`/v1/me/history/${slug}`), accessToken).send(body)
const historyOf = async (accessToken: string, query = '') =>
  (await auth(http().get(`/v1/me/history${query}`), accessToken).expect(200)).body.data as {
    story: { slug: string }
    progress: { slug: string; chapter: number; progress: number; readAt: string }
  }[]
const merge = (accessToken: string, entries: object[]) =>
  auth(http().post('/v1/me/history/merge'), accessToken).send({ entries })
const setReadAt = (userId: string, storyId: string, readAt: Date) =>
  db
    .update(readingHistory)
    .set({ readAt })
    .where(and(eq(readingHistory.userId, userId), eq(readingHistory.storyId, storyId)))

describe('lưu chỗ đọc dở', () => {
  it('lưu rồi đọc lại; cùng chương không gửi progress thì giữ, đổi chương thì về 0', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const first = await save(reader.accessToken, story.slug, {
      chapter: 3,
      chapter_title: 'Ba',
      progress: 0.42,
    }).expect(200)
    expect(first.body.data).toEqual({
      slug: story.slug,
      chapter: 3,
      chapterTitle: 'Ba',
      progress: 0.42,
      readAt: expect.any(String),
    })
    await save(reader.accessToken, story.slug, { chapter: 3, chapterTitle: 'Ba' }).expect(200)
    const same = await auth(http().get(`/v1/me/history/${story.slug}`), reader.accessToken)
    expect(same.body.data).toMatchObject({ chapter: 3, progress: 0.42 })

    const next = await save(reader.accessToken, story.slug, { chapter: 4 }).expect(200)
    expect(next.body.data).toMatchObject({ chapter: 4, chapterTitle: '', progress: 0 })
  })

  it('tên chương dài cắt còn 120 ký tự; progress ngoài 0–1, chương sai → 400', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const res = await save(reader.accessToken, story.slug, {
      chapter: 1,
      chapterTitle: 'Dài '.repeat(100),
    }).expect(200)
    expect(Array.from(res.body.data.chapterTitle as string)).toHaveLength(120)
    for (const body of [
      { chapter: 1, progress: 1.5 },
      { chapter: 0 },
      { chapter: '2' },
      { chapterTitle: 'Thiếu số chương' },
    ]) {
      const bad = await save(reader.accessToken, story.slug, body).expect(400)
      expect(bad.body.error.code).toBe('validation_failed')
    }
  })

  it('truyện nháp của người khác, slug không có → 404; chưa đăng nhập → 401', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await save(reader.accessToken, draft.slug, { chapter: 1 }).expect(404)
    await save(reader.accessToken, `khong-co-${randomLetters(8)}`, { chapter: 1 }).expect(404)
    // Chủ truyện xem trước được thì lưu được (chưa xác nhận email vẫn lưu được)
    await save(owner.accessToken, draft.slug, { chapter: 1 }).expect(200)
    const res = await http().put(`/v1/me/history/${draft.slug}`).send({ chapter: 1 }).expect(401)
    expect(res.body.error.code).toBe('unauthenticated')
  })
})

describe('danh sách, một truyện, xóa', () => {
  it('mới đọc trước, limit; truyện bị ẩn không hiện; chỉ thấy lịch sử của mình', async () => {
    const reader = await registerUser(app)
    const other = await registerUser(app)
    const owner = await registerUser(app)
    const [a, b, c] = [
      await createStory(db, { ownerId: owner.id }),
      await createStory(db, { ownerId: owner.id }),
      await createStory(db, { ownerId: owner.id }),
    ]
    for (const story of [a, b, c]) await save(reader.accessToken, story.slug, { chapter: 1 })
    await save(other.accessToken, a.slug, { chapter: 2 })
    await setReadAt(reader.id, a.id, new Date('2026-10-01T00:00:00Z'))
    await setReadAt(reader.id, b.id, new Date('2026-10-03T00:00:00Z'))
    await setReadAt(reader.id, c.id, new Date('2026-10-02T00:00:00Z'))

    const items = await historyOf(reader.accessToken)
    expect(items.map((i) => i.story.slug)).toEqual([b.slug, c.slug, a.slug])
    expect(items[0]!.progress).toMatchObject({ slug: b.slug, chapter: 1 })
    expect((await historyOf(reader.accessToken, '?limit=1')).map((i) => i.story.slug)).toEqual([
      b.slug,
    ])

    await db.update(stories).set({ visibility: 'draft' }).where(eq(stories.id, b.id))
    expect((await historyOf(reader.accessToken)).map((i) => i.story.slug)).toEqual([c.slug, a.slug])
    expect((await historyOf(other.accessToken)).map((i) => i.progress.chapter)).toEqual([2])
  })

  it('chưa đọc → data null; xóa một truyện; xóa hết', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const a = await createStory(db, { ownerId: owner.id })
    const b = await createStory(db, { ownerId: owner.id })
    const none = await auth(http().get(`/v1/me/history/${a.slug}`), reader.accessToken).expect(200)
    expect(none.body.data).toBeNull()

    await save(reader.accessToken, a.slug, { chapter: 1 })
    await save(reader.accessToken, b.slug, { chapter: 1 })
    await auth(http().delete(`/v1/me/history/${a.slug}`), reader.accessToken).expect(204)
    expect((await historyOf(reader.accessToken)).map((i) => i.story.slug)).toEqual([b.slug])
    await auth(http().delete('/v1/me/history'), reader.accessToken).expect(204)
    expect(await historyOf(reader.accessToken)).toEqual([])
  })

  it('xóa truyện, xóa tài khoản: lịch sử mất theo', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await save(reader.accessToken, story.slug, { chapter: 1 })
    await db.delete(users).where(eq(users.id, reader.id))
    expect(
      await db.select().from(readingHistory).where(eq(readingHistory.storyId, story.id)),
    ).toEqual([])
  })
})

describe('gộp lịch sử lúc còn là khách', () => {
  it('thêm truyện chưa có; giữ dòng mới hơn; dòng cùng truyện lấy mới nhất; slug lạ bỏ qua', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const [fresh, serverNewer, guestNewer] = [
      await createStory(db, { ownerId: owner.id }),
      await createStory(db, { ownerId: owner.id }),
      await createStory(db, { ownerId: owner.id }),
    ]
    const hidden = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await save(reader.accessToken, serverNewer.slug, { chapter: 9 })
    await save(reader.accessToken, guestNewer.slug, { chapter: 2 })
    await setReadAt(reader.id, guestNewer.id, new Date('2026-01-01T00:00:00Z'))

    await merge(reader.accessToken, [
      {
        slug: fresh.slug,
        chapter: 3,
        chapter_title: 'Ba',
        progress: 0.5,
        readAt: '2026-02-01T00:00:00Z',
      },
      { slug: fresh.slug, chapter: 5, chapterTitle: 'Năm', readAt: '2026-03-01T00:00:00Z' },
      { slug: serverNewer.slug, chapter: 1, readAt: '2026-01-01T00:00:00Z' },
      { slug: guestNewer.slug, chapter: 7, progress: 0.25, readAt: '2026-02-01T00:00:00Z' },
      { slug: hidden.slug, chapter: 1 },
      { slug: `khong-co-${randomLetters(8)}`, chapter: 1 },
    ]).expect(204)

    const bySlug = new Map(
      (await historyOf(reader.accessToken)).map((i) => [i.story.slug, i.progress]),
    )
    expect(bySlug.get(fresh.slug)).toMatchObject({
      chapter: 5,
      progress: 0,
      readAt: '2026-03-01T00:00:00.000Z',
    })
    expect(bySlug.get(serverNewer.slug)).toMatchObject({ chapter: 9 })
    expect(bySlug.get(guestNewer.slug)).toMatchObject({ chapter: 7, progress: 0.25 })
    expect(bySlug.has(hidden.slug)).toBe(false)
  })

  it('readAt tương lai coi là bây giờ; quá 100 dòng, sai kiểu → 400', async () => {
    const reader = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await merge(reader.accessToken, [
      { slug: story.slug, chapter: 1, readAt: '2099-01-01T00:00:00Z' },
    ]).expect(204)
    const [item] = await historyOf(reader.accessToken)
    expect(Date.parse(item!.progress.readAt)).toBeLessThanOrEqual(Date.now())

    const many = Array.from({ length: 101 }, () => ({ slug: story.slug, chapter: 1 }))
    await merge(reader.accessToken, many).expect(400)
    for (const entry of [
      { slug: story.slug, chapter: 0 },
      { slug: story.slug, chapter: 1, progress: 2 },
      { slug: story.slug, chapter: 1, readAt: 'hôm qua' },
    ]) {
      await merge(reader.accessToken, [entry]).expect(400)
    }
  })
})
