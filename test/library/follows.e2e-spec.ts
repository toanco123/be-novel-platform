// Theo dõi truyện, tủ truyện, số truyện có chương mới (trigger mốc "đã thấy", số người theo dõi)
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { chapters, stories, storyStats, users } from '@/infra/database/schema'
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
const auth = (req: request.Test, accessToken: string) =>
  req.set('Authorization', `Bearer ${accessToken}`)
const follow = (accessToken: string, slug: string) =>
  auth(http().put(`/v1/stories/${slug}/follow`), accessToken)
const unfollow = (accessToken: string, slug: string) =>
  auth(http().delete(`/v1/stories/${slug}/follow`), accessToken)
const following = async (accessToken: string, slug: string) =>
  (await auth(http().get(`/v1/stories/${slug}/follow`), accessToken).expect(200)).body.data
    .following as boolean
const followers = async (storyId: string) => {
  const [row] = await db
    .select({ count: storyStats.followerCount })
    .from(storyStats)
    .where(eq(storyStats.storyId, storyId))
  return row!.count
}
type LibraryItem = {
  story: { slug: string }
  seenChapter: number
  newChapters: number
  progress: { chapter: number } | null
}
const library = async (accessToken: string) =>
  (await auth(http().get('/v1/me/library'), accessToken).expect(200)).body.data as LibraryItem[]
const updateCount = async (accessToken: string) =>
  (await auth(http().get('/v1/me/library/update-count'), accessToken).expect(200)).body.data
    .count as number
const publish = (storyId: string, number: number) =>
  db.insert(chapters).values({
    storyId,
    number,
    title: `Chương ${number}`,
    content: 'x',
    status: 'published',
    publishedAt: new Date(),
  })
/** Ngày `day` tháng 1/2026 (UTC) */
const at = (day: number) => new Date(Date.UTC(2026, 0, day))
const saveProgress = (accessToken: string, slug: string, chapter: number) =>
  auth(http().put(`/v1/me/history/${slug}`), accessToken)
    .send({ chapter })
    .expect(200)

describe('theo dõi', () => {
  it('theo dõi, bỏ theo dõi; số người theo dõi ±1; gọi lặp không đếm thêm', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    expect(await following(reader.accessToken, story.slug)).toBe(false)
    await follow(reader.accessToken, story.slug).expect(204)
    await follow(reader.accessToken, story.slug).expect(204)
    expect(await following(reader.accessToken, story.slug)).toBe(true)
    expect(await followers(story.id)).toBe(1)
    await unfollow(reader.accessToken, story.slug).expect(204)
    await unfollow(reader.accessToken, story.slug).expect(204)
    expect(await following(reader.accessToken, story.slug)).toBe(false)
    expect(await followers(story.id)).toBe(0)
  })

  it('chưa xác nhận email → 403 (vẫn bỏ theo dõi được); chưa đăng nhập → 401; truyện nháp → 404', async () => {
    const unverified = await registerUser(app)
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const res = await follow(unverified.accessToken, story.slug).expect(403)
    expect(res.body.error.code).toBe('email_not_verified')
    await unfollow(unverified.accessToken, story.slug).expect(204)
    await http().put(`/v1/stories/${story.slug}/follow`).expect(401)
    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await follow(reader.accessToken, draft.slug).expect(404)
    await auth(http().get(`/v1/stories/${draft.slug}/follow`), reader.accessToken).expect(404)
  })

  it('người theo dõi xóa tài khoản: số người theo dõi giảm; xóa truyện: không lỗi', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await follow(reader.accessToken, story.slug).expect(204)
    await db.delete(users).where(eq(users.id, reader.id))
    expect(await followers(story.id)).toBe(0)

    const other = await verifiedUser(app)
    await follow(other.accessToken, story.slug).expect(204)
    await db.delete(stories).where(eq(stories.id, story.id))
    expect(await library(other.accessToken)).toEqual([])
  })
})

describe('mốc "đã thấy" và chương mới', () => {
  it('theo dõi lấy chương mới nhất; xuất bản thêm → chương mới; đọc tới thì hết', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [{ number: 1 }, { number: 5 }],
    })
    await follow(reader.accessToken, story.slug).expect(204)
    expect(await library(reader.accessToken)).toMatchObject([
      { story: { slug: story.slug }, seenChapter: 5, newChapters: 0, progress: null },
    ])
    const before = await updateCount(reader.accessToken)

    await publish(story.id, 6)
    await publish(story.id, 7)
    expect(await library(reader.accessToken)).toMatchObject([{ seenChapter: 5, newChapters: 2 }])
    expect(await updateCount(reader.accessToken)).toBe(before + 1)

    await saveProgress(reader.accessToken, story.slug, 7)
    expect(await library(reader.accessToken)).toMatchObject([
      { seenChapter: 7, newChapters: 0, progress: { chapter: 7 } },
    ])
    expect(await updateCount(reader.accessToken)).toBe(before)
  })

  it('đã đọc xa hơn chương mới nhất trước khi theo dõi → mốc theo chỗ đã đọc', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id, chapters: [{ number: 1 }] })
    await saveProgress(reader.accessToken, story.slug, 9)
    await follow(reader.accessToken, story.slug).expect(204)
    expect(await library(reader.accessToken)).toMatchObject([{ seenChapter: 9 }])
  })
})

describe('tủ truyện', () => {
  it('có chương mới trước, rồi mới cập nhật; truyện bị ẩn tạm không hiện; chỉ của mình', async () => {
    const reader = await verifiedUser(app)
    const other = await verifiedUser(app)
    const owner = await registerUser(app)
    const [older, newer, updated] = [
      await createStory(db, { ownerId: owner.id }),
      await createStory(db, { ownerId: owner.id }),
      await createStory(db, { ownerId: owner.id }),
    ]
    for (const story of [older, newer, updated]) {
      await follow(reader.accessToken, story.slug).expect(204)
    }
    await follow(other.accessToken, older.slug).expect(204)
    for (const [story, day] of [
      [older, 1],
      [newer, 3],
      [updated, 2],
    ] as const) {
      await db
        .update(stories)
        .set({ createdAt: at(day), publishedAt: at(day) })
        .where(eq(stories.id, story.id))
      await db
        .update(storyStats)
        .set({ lastChapterAt: at(day) })
        .where(eq(storyStats.storyId, story.id))
    }
    // Chương mới (ngày hôm nay) của truyện cũ nhất đưa nó lên đầu
    await publish(older.id, 2)

    expect((await library(reader.accessToken)).map((i) => i.story.slug)).toEqual([
      older.slug,
      newer.slug,
      updated.slug,
    ])
    await db.update(stories).set({ visibility: 'draft' }).where(eq(stories.id, newer.id))
    expect((await library(reader.accessToken)).map((i) => i.story.slug)).toEqual([
      older.slug,
      updated.slug,
    ])
    expect((await library(other.accessToken)).map((i) => i.story.slug)).toEqual([older.slug])
  })
})
