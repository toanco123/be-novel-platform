// Danh sách truyện (lọc, sắp xếp, tác giả, phân trang) và truyện chọn tay cho trang chủ. DB dùng
// chung giữa các file test nên mỗi test lọc theo thể loại / tác giả riêng của nó.
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { curatedStories, stories, storyStats } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { registerUser } from '../helpers/auth'
import { createGenre, createStory } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const slugs = (body: { data: { slug: string }[] }) => body.data.map((s) => s.slug)
/** Ngày n tháng 1/2026 (UTC) */
const day = (n: number) => new Date(Date.UTC(2026, 0, n))
const setStats = (storyId: string, stats: Partial<typeof storyStats.$inferInsert>) =>
  db.update(storyStats).set(stats).where(eq(storyStats.storyId, storyId))

describe('GET /v1/stories', () => {
  it('chỉ truyện công khai có chương đã xuất bản; mô tả 300 ký tự; Cache-Control', async () => {
    const owner = await registerUser(app)
    const genre = await createGenre(db)
    const shown = await createStory(db, {
      ownerId: owner.id,
      genres: [genre],
      description: 'Mô tả dài. '.repeat(50),
    })
    await createStory(db, { ownerId: owner.id, genres: [genre], visibility: 'draft' })
    await createStory(db, {
      ownerId: owner.id,
      genres: [genre],
      chapters: [{ number: 1, status: 'draft' }],
    })
    const res = await http().get(`/v1/stories?genre=${genre}`).expect(200)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
    expect(slugs(res.body)).toEqual([shown.slug])
    expect(res.body.data[0].description).toHaveLength(300)
    expect(res.body.meta).toMatchObject({ total: 1, page: 1, pageSize: 20, pageCount: 1 })
  })

  it('lọc trạng thái và độ dài (theo số chương đã xuất bản)', async () => {
    const owner = await registerUser(app)
    const genre = await createGenre(db)
    const make = async (chapterCount: number, status: 'ongoing' | 'completed' = 'ongoing') => {
      const story = await createStory(db, { ownerId: owner.id, genres: [genre], status })
      await setStats(story.id, { chapterCount })
      return story.slug
    }
    const s49 = await make(49)
    const s50 = await make(50, 'completed')
    const s200 = await make(200)
    const s201 = await make(201, 'completed')
    const list = async (query: string) =>
      slugs((await http().get(`/v1/stories?genre=${genre}&${query}`).expect(200)).body).toSorted()
    expect(await list('length=short')).toEqual([s49])
    expect(await list('length=medium')).toEqual([s50, s200].toSorted())
    expect(await list('length=long')).toEqual([s201])
    expect(await list('status=completed')).toEqual([s50, s201].toSorted())
    expect(await list('status=ongoing&length=medium')).toEqual([s200])
  })

  it('lọc tác giả: cùng chủ truyện và cùng bút danh', async () => {
    const owner = await registerUser(app)
    const other = await registerUser(app)
    const plain = await createStory(db, { ownerId: owner.id })
    const penA = await createStory(db, { ownerId: owner.id, authorName: 'Bút Danh A' })
    await createStory(db, { ownerId: owner.id, authorName: 'Bút Danh B' })
    await createStory(db, { ownerId: other.id, authorName: 'Bút Danh A' })
    const byAuthor = async (author: string) =>
      slugs((await http().get(`/v1/stories?author=${author}`).expect(200)).body)
    expect(await byAuthor(`tac-gia-${owner.id}`)).toEqual([plain.slug])
    const res = await http().get(`/v1/stories?author=tac-gia-${owner.id}-but-danh-a`).expect(200)
    expect(slugs(res.body)).toEqual([penA.slug])
    expect(res.body.data[0].author).toEqual({
      slug: `tac-gia-${owner.id}-but-danh-a`,
      name: 'Bút Danh A',
    })
  })

  it('sắp xếp: mới cập nhật (mặc định), lượt đọc, điểm, mới đăng; phân trang', async () => {
    const owner = await registerUser(app)
    const genre = await createGenre(db)
    const make = async (index: number, stats: Partial<typeof storyStats.$inferInsert>) => {
      const story = await createStory(db, { ownerId: owner.id, genres: [genre] })
      await db
        .update(stories)
        .set({ createdAt: day(index), publishedAt: day(index) })
        .where(eq(stories.id, story.id))
      await setStats(story.id, { lastChapterAt: day(index), ...stats })
      return story.slug
    }
    // a: đăng sớm nhất, cập nhật muộn nhất; b: đọc nhiều nhất; c: điểm cao nhất, đăng muộn nhất
    const a = await make(1, { lastChapterAt: day(20), viewCount: 5, ratingCounts: [0, 0, 1, 0, 0] })
    const b = await make(2, { viewCount: 50, ratingCounts: [0, 0, 0, 1, 0] })
    const c = await make(3, { viewCount: 1, ratingCounts: [0, 0, 0, 0, 2] })
    const sorted = async (sort?: string) =>
      slugs(
        (
          await http()
            .get(`/v1/stories?genre=${genre}${sort ? `&sort=${sort}` : ''}`)
            .expect(200)
        ).body,
      )
    expect(await sorted()).toEqual([a, c, b])
    expect(await sorted('views')).toEqual([b, a, c])
    expect(await sorted('rating')).toEqual([c, b, a])
    expect(await sorted('newest')).toEqual([c, b, a])

    const page2 = await http().get(`/v1/stories?genre=${genre}&sort=views&page=2&pageSize=2`)
    expect(slugs(page2.body)).toEqual([c])
    expect(page2.body.meta).toMatchObject({ total: 3, page: 2, pageSize: 2, pageCount: 2 })
  })

  it('tham số sai → 400 validation_failed', async () => {
    for (const query of [
      'sort=hot',
      'status=paused',
      'length=huge',
      `genre=${encodeURIComponent('Ngôn Tình')}`,
      'author=abc',
      'author=tac-gia-khong-phai-uuid',
    ]) {
      const res = await http().get(`/v1/stories?${query}`).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })
})

describe('GET /v1/curated-stories', () => {
  it('truyện chọn tay theo vị trí, bỏ truyện không còn công khai', async () => {
    const owner = await registerUser(app)
    const first = await createStory(db, { ownerId: owner.id })
    const second = await createStory(db, { ownerId: owner.id })
    const hidden = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await db.delete(curatedStories).where(eq(curatedStories.list, 'editor_pick'))
    await db.insert(curatedStories).values([
      { list: 'editor_pick', storyId: second.id, position: 0 },
      { list: 'editor_pick', storyId: hidden.id, position: 1 },
      { list: 'editor_pick', storyId: first.id, position: 2 },
    ])
    const res = await http().get('/v1/curated-stories?list=editor_pick').expect(200)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
    expect(slugs(res.body)).toEqual([second.slug, first.slug])
    expect(res.body.meta).toEqual({ requestId: expect.any(String) })
  })

  it('chưa chọn tay: nổi bật tự lấy 4 truyện đọc nhiều nhất, đề cử 8 truyện điểm cao nhất', async () => {
    const owner = await registerUser(app)
    const popular = await createStory(db, { ownerId: owner.id })
    await setStats(popular.id, { viewCount: 1_000_000_000_000 })
    const best = await createStory(db, { ownerId: owner.id })
    await setStats(best.id, { ratingCounts: [0, 0, 0, 0, 1_000_000] })
    await db.delete(curatedStories)

    const featured = await http().get('/v1/curated-stories?list=featured').expect(200)
    expect(featured.body.data.length).toBeLessThanOrEqual(4)
    expect(featured.body.data[0].slug).toBe(popular.slug)
    const picks = await http().get('/v1/curated-stories?list=editor_pick').expect(200)
    expect(picks.body.data.length).toBeLessThanOrEqual(8)
    expect(picks.body.data[0].slug).toBe(best.slug)
  })

  it('list sai hoặc thiếu → 400', async () => {
    await http().get('/v1/curated-stories?list=hot').expect(400)
    await http().get('/v1/curated-stories').expect(400)
  })
})
