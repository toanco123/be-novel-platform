// Tìm kiếm không dấu, thể loại khớp từ khóa, bảng xếp hạng, truyện liên quan. DB dùng chung giữa các
// file test: dùng từ khóa ngẫu nhiên, hoặc số liệu vượt trội rồi chỉ xét các truyện của test.
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { vietnamDate } from '@/common/utils/vietnam-date'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { chapterViews, storyStats } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { registerUser } from '../helpers/auth'
import { createGenre, createStory, randomLetters } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const slugs = (body: { data: { slug: string }[] }) => body.data.map((s) => s.slug)
const setStats = (storyId: string, stats: Partial<typeof storyStats.$inferInsert>) =>
  db.update(storyStats).set(stats).where(eq(storyStats.storyId, storyId))
/** Ngày cách hôm nay `n` ngày theo giờ Việt Nam */
const daysAgo = (n: number) => vietnamDate(new Date(Date.now() - n * 86_400_000))

describe('GET /v1/search', () => {
  it('chấm điểm như Supabase, cùng điểm thì đọc nhiều trước; không dấu; bỏ truyện nháp', async () => {
    const owner = await registerUser(app)
    // Hai từ ngẫu nhiên, viết có dấu trong tên truyện, tìm bằng chữ không dấu
    const one = randomLetters(7)
    const two = randomLetters(7)
    const titled = (title: string, extra: object = {}) =>
      createStory(db, { ownerId: owner.id, title, ...extra })
    const starts = await titled(`Đa${one} Bê${two} mở đầu`)
    const containsLow = await titled(`Truyện đa${one} bê${two}`)
    const containsHigh = await titled(`Chuyện Đa${one} Bê${two}`)
    await setStats(containsHigh.id, { viewCount: 100 })
    const allWords = await titled(`Bê${two} và đa${one}`)
    const byAuthor = await titled(`Truyện khác ${randomLetters(6)}`, {
      authorName: `Đa${one} Bê${two}`,
    })
    await titled(`Đa${one} thôi`)
    await titled(`Đa${one} Bê${two} nháp`, { visibility: 'draft' })

    const res = await http()
      .get('/v1/search')
      .query({ q: `DA${one.toUpperCase()} be${two}` })
      .expect(200)
    expect(slugs(res.body)).toEqual([
      starts.slug,
      containsHigh.slug,
      containsLow.slug,
      allWords.slug,
      byAuthor.slug,
    ])
    expect(res.body.meta).toMatchObject({ total: 5, page: 1, pageSize: 20 })

    const page = await http()
      .get('/v1/search')
      .query({ q: `da${one} be${two}`, page: 2, pageSize: 2 })
      .expect(200)
    expect(slugs(page.body)).toEqual([containsLow.slug, allWords.slug])
    expect(page.body.meta).toMatchObject({ total: 5, pageCount: 3 })
  })

  it('từ khóa chỉ có ký tự đặc biệt → trang rỗng; thiếu q, q quá 100 ký tự → 400', async () => {
    const res = await http().get('/v1/search').query({ q: '!!!' }).expect(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta).toMatchObject({ total: 0, pageCount: 0 })
    await http().get('/v1/search').expect(400)
    await http()
      .get('/v1/search')
      .query({ q: 'a'.repeat(101) })
      .expect(400)
  })
})

describe('GET /v1/genres?q=', () => {
  it('chỉ thể loại có slug chứa từ khóa, không dấu', async () => {
    const word = randomLetters(10)
    const match = await createGenre(db, `Thể loại ${word}`)
    await createGenre(db, `Khác ${randomLetters(10)}`)
    const res = await http()
      .get('/v1/genres')
      .query({ q: `THE LOAI ${word}` })
      .expect(200)
    expect(res.body.data.map((g: { slug: string }) => g.slug)).toEqual([match])
    expect((await http().get('/v1/genres').query({ q: '%%' }).expect(200)).body.data).toEqual([])
  })
})

/** Vị trí và giá trị của các truyện của test trong bảng xếp hạng */
const ranked = async (query: Record<string, string>, ids: string[]) => {
  const res = await http().get('/v1/ranking').query(query).expect(200)
  expect(res.headers['cache-control']).toBe('public, max-age=60')
  const rows = res.body.data as { value: number; story: { id: string } }[]
  return rows.filter((row) => ids.includes(row.story.id)).map((row) => [row.story.id, row.value])
}

describe('GET /v1/ranking', () => {
  it('lượt đọc theo tuần (7 ngày), tháng (30 ngày), tất cả', async () => {
    const owner = await registerUser(app)
    const recent = await createStory(db, { ownerId: owner.id })
    const older = await createStory(db, { ownerId: owner.id })
    await db.insert(chapterViews).values([
      { storyId: recent.id, chapterNumber: 1, day: daysAgo(6), views: 1_000_000 },
      { storyId: older.id, chapterNumber: 1, day: daysAgo(7), views: 5_000_000 },
      { storyId: older.id, chapterNumber: 1, day: daysAgo(0), views: 500_000 },
      { storyId: older.id, chapterNumber: 1, day: daysAgo(30), views: 9_000_000 },
    ])
    await setStats(recent.id, { viewCount: 2_000_000_000 })
    await setStats(older.id, { viewCount: 3_000_000_000 })
    const ids = [recent.id, older.id]
    expect(await ranked({}, ids)).toEqual([
      [recent.id, 1_000_000],
      [older.id, 500_000],
    ])
    expect(await ranked({ period: 'month' }, ids)).toEqual([
      [older.id, 5_500_000],
      [recent.id, 1_000_000],
    ])
    expect(await ranked({ period: 'all' }, ids)).toEqual([
      [older.id, 3_000_000_000],
      [recent.id, 2_000_000_000],
    ])
  })

  it('điểm có trọng số: 5 sao một lượt đứng sau 4,99 sao nhiều lượt; value là điểm thật', async () => {
    const owner = await registerUser(app)
    const single = await createStory(db, { ownerId: owner.id })
    const many = await createStory(db, { ownerId: owner.id })
    const low = await createStory(db, { ownerId: owner.id })
    await setStats(single.id, { ratingCounts: [0, 0, 0, 0, 1] })
    await setStats(many.id, { ratingCounts: [0, 0, 0, 10_000, 990_000] })
    await setStats(low.id, { ratingCounts: [1, 0, 0, 0, 0] })
    expect(await ranked({ by: 'rating', limit: '100' }, [single.id, many.id, low.id])).toEqual([
      [many.id, 4.99],
      [single.id, 5],
      [low.id, 1],
    ])
  })

  it('người theo dõi; tham số sai → 400', async () => {
    const owner = await registerUser(app)
    const first = await createStory(db, { ownerId: owner.id })
    const second = await createStory(db, { ownerId: owner.id })
    await setStats(first.id, { followerCount: 1_000_000_000 })
    await setStats(second.id, { followerCount: 999_999_999 })
    expect(await ranked({ by: 'follows' }, [first.id, second.id])).toEqual([
      [first.id, 1_000_000_000],
      [second.id, 999_999_999],
    ])
    for (const query of ['by=votes', 'period=year', 'limit=101', 'limit=0']) {
      const res = await http().get(`/v1/ranking?${query}`).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })
})

describe('GET /v1/stories/:slug/related', () => {
  it('nhiều thể loại trùng trước, rồi lượt đọc; bỏ truyện cùng chủ, truyện nháp', async () => {
    const [author, other, third] = await Promise.all([
      registerUser(app),
      registerUser(app),
      registerUser(app),
    ])
    const [g1, g2, g3] = [await createGenre(db), await createGenre(db), await createGenre(db)]
    const base = await createStory(db, { ownerId: author.id, genres: [g1, g2, g3] })
    const twoShared = await createStory(db, { ownerId: other.id, genres: [g2, g1] })
    const popular = await createStory(db, { ownerId: other.id, genres: [g1] })
    await setStats(popular.id, { viewCount: 100 })
    const quiet = await createStory(db, { ownerId: third.id, genres: [g3] })
    await setStats(quiet.id, { viewCount: 50 })
    await createStory(db, { ownerId: author.id, genres: [g1, g2, g3] })
    await createStory(db, { ownerId: other.id, genres: [g1, g2, g3], visibility: 'draft' })

    const res = await http().get(`/v1/stories/${base.slug}/related`).expect(200)
    expect(slugs(res.body)).toEqual([twoShared.slug, popular.slug, quiet.slug])
    const limited = await http().get(`/v1/stories/${base.slug}/related?limit=2`).expect(200)
    expect(slugs(limited.body)).toEqual([twoShared.slug, popular.slug])
  })

  it('truyện không có thể loại → rỗng; truyện nháp của người khác → 404; limit sai → 400', async () => {
    const owner = await registerUser(app)
    const plain = await createStory(db, { ownerId: owner.id })
    expect((await http().get(`/v1/stories/${plain.slug}/related`).expect(200)).body.data).toEqual(
      [],
    )
    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await http().get(`/v1/stories/${draft.slug}/related`).expect(404)
    await http().get(`/v1/stories/${plain.slug}/related?limit=51`).expect(400)
  })
})
