// Bảng truyện, chương (trigger số liệu, constraint, hàm slugify) và chi tiết truyện cho người đọc
import type { NestExpressApplication } from '@nestjs/platform-express'
import { and, eq, sql } from 'drizzle-orm'
import request from 'supertest'
import { findPgError } from '@/common/errors/pg-error'
import { slugify } from '@/common/utils/slugify'
import { AppConfig } from '@/config/app-config.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { chapters, stories, storyStats, users } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { adminUser, registerUser } from '../helpers/auth'
import { createGenre, createStory, randomLetters } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const getStory = (slug: string, accessToken?: string) => {
  const req = http().get(`/v1/stories/${slug}`)
  return accessToken ? req.set('Authorization', `Bearer ${accessToken}`) : req
}

describe('số liệu truyện (trigger)', () => {
  it('chỉ đếm chương đã xuất bản; chương đầu, mới nhất; chương hẹn giờ sớm nhất', async () => {
    const owner = await registerUser(app)
    const soon = new Date(Date.now() + 86_400_000)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [
        { number: 2, title: 'Hai' },
        { number: 5, title: 'Năm' },
        { number: 7, status: 'draft' },
        { number: 8, status: 'draft', scheduledAt: new Date(soon.getTime() + 3_600_000) },
        { number: 9, status: 'draft', scheduledAt: soon },
      ],
    })
    const { body } = await getStory(story.slug).expect(200)
    expect(body.data).toMatchObject({
      chapterCount: 2,
      firstChapterNumber: 2,
      latestChapter: { number: 5, title: 'Năm' },
      nextChapter: { number: 9, at: soon.toISOString() },
    })
  })

  it('ẩn, xóa chương thì số liệu đổi theo', async () => {
    const owner = await registerUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [
        { number: 1, title: 'Một' },
        { number: 2, title: 'Hai' },
      ],
    })
    const chapter = (n: number) => and(eq(chapters.storyId, story.id), eq(chapters.number, n))
    await db.update(chapters).set({ status: 'draft' }).where(chapter(2))
    expect((await getStory(story.slug).expect(200)).body.data).toMatchObject({
      chapterCount: 1,
      latestChapter: { number: 1, title: 'Một' },
    })
    await db.delete(chapters).where(chapter(1))
    expect((await getStory(story.slug).expect(200)).body.data).toMatchObject({
      chapterCount: 0,
      firstChapterNumber: null,
      latestChapter: null,
      nextChapter: null,
    })
  })

  it('xóa tài khoản chủ truyện: cascade xóa truyện, chương, số liệu', async () => {
    const owner = await registerUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [{ number: 1 }, { number: 2 }],
    })
    await db.delete(users).where(eq(users.id, owner.id))
    expect(await db.select().from(storyStats).where(eq(storyStats.storyId, story.id))).toEqual([])
    expect(await db.select().from(chapters).where(eq(chapters.storyId, story.id))).toEqual([])
    await getStory(story.slug).expect(404)
  })
})

describe('GET /v1/stories/:slug', () => {
  it('khách xem truyện công khai: đủ trường, thể loại theo thứ tự tác giả chọn, URL bìa', async () => {
    const owner = await registerUser(app, { displayName: 'Chủ truyện' })
    const first = await createGenre(db, `Huyen huyen ${randomLetters(8)}`)
    const second = await createGenre(db, `Do thi ${randomLetters(8)}`)
    const description = 'Mô tả dài. '.repeat(60)
    const story = await createStory(db, {
      ownerId: owner.id,
      title: `Truyen day du ${randomLetters(8)}`,
      description,
      status: 'completed',
      genres: [second, first],
      coverPath: `${owner.id}/bia.webp`,
      coverThumbPath: `${owner.id}/bia-thumb.webp`,
      chapters: [{ number: 1, title: 'Mở đầu' }],
    })
    const covers = `${app.get(AppConfig).get('S3_PUBLIC_URL')}/covers/${owner.id}`
    const { body } = await getStory(story.slug).expect(200)
    expect(body).toEqual({
      statusCode: 200,
      data: {
        id: story.id,
        slug: story.slug,
        title: story.title,
        author: { slug: `tac-gia-${owner.id}`, name: 'Chủ truyện' },
        genres: [
          { slug: second, name: expect.stringMatching(/^Do thi /), description: null },
          { slug: first, name: expect.stringMatching(/^Huyen huyen /), description: null },
        ],
        status: 'completed',
        visibility: 'published',
        description,
        coverUrl: `${covers}/bia.webp`,
        coverThumbUrl: `${covers}/bia-thumb.webp`,
        chapterCount: 1,
        firstChapterNumber: 1,
        latestChapter: { number: 1, title: 'Mở đầu' },
        nextChapter: null,
        viewCount: 0,
        followerCount: 0,
        ratingAvg: 0,
        ratingCount: 0,
        ratingCounts: [0, 0, 0, 0, 0],
        ownerId: owner.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      meta: { requestId: expect.any(String) },
    })
  })

  it('số liệu chấm điểm: ratingAvg, ratingCount tính từ ratingCounts', async () => {
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await db
      .update(storyStats)
      .set({ ratingCounts: [0, 0, 1, 0, 2], viewCount: 12, followerCount: 3 })
      .where(eq(storyStats.storyId, story.id))
    expect((await getStory(story.slug).expect(200)).body.data).toMatchObject({
      ratingCounts: [0, 0, 1, 0, 2],
      ratingCount: 3,
      ratingAvg: 4.33,
      viewCount: 12,
      followerCount: 3,
    })
  })

  it('bút danh: author.name là bút danh, author.slug thêm slug của bút danh', async () => {
    const owner = await registerUser(app, { displayName: 'Tài khoản' })
    const story = await createStory(db, { ownerId: owner.id, authorName: 'Mặc Hương Đồng Khứu' })
    expect((await getStory(story.slug).expect(200)).body.data.author).toEqual({
      slug: `tac-gia-${owner.id}-mac-huong-dong-khuu`,
      name: 'Mặc Hương Đồng Khứu',
    })
  })

  it('truyện nháp: khách, người khác → 404; chủ truyện xem trước được', async () => {
    const owner = await registerUser(app)
    const other = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    expect((await getStory(story.slug).expect(404)).body.error.code).toBe('not_found')
    await getStory(story.slug, other.accessToken).expect(404)
    const { body } = await getStory(story.slug, owner.accessToken).expect(200)
    expect(body.data.visibility).toBe('draft')
  })

  it('truyện chờ duyệt: quản trị viên xem được; truyện nháp chưa gửi duyệt thì không', async () => {
    const owner = await registerUser(app)
    const admin = await adminUser(app)
    const pending = await createStory(db, {
      ownerId: owner.id,
      visibility: 'draft',
      reviewStatus: 'pending',
    })
    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await getStory(pending.slug).expect(404)
    await getStory(pending.slug, admin.accessToken).expect(200)
    await getStory(draft.slug, admin.accessToken).expect(404)
  })

  it('slug không có → 404; token sai → 401 invalid_token', async () => {
    expect((await getStory(`khong-co-${randomLetters(10)}`).expect(404)).body.error.code).toBe(
      'not_found',
    )
    const res = await getStory(`khong-co-${randomLetters(10)}`, 'sai').expect(401)
    expect(res.body.error.code).toBe('invalid_token')
  })
})

/** Lỗi Postgres của câu lệnh (null nếu chạy được) */
const failure = (query: Promise<unknown>) =>
  query.then(
    () => null,
    (error: unknown) => findPgError(error),
  )

describe('bảng và hàm SQL', () => {
  it('hàm SQL slugify cho cùng kết quả với slugify TypeScript; search_title tự sinh', async () => {
    const samples = [
      'Ngôn Tình Đô Thị!',
      'ĐẠI ĐƯỜNG song long',
      '  --Kiếm hiệp-- cổ   điển ',
      'Truyện 2026 #1: Hồi kết',
      'Ếch ộp, ữ ỹ ẵ',
      'café crème',
      '!!!',
    ]
    for (const text of samples) {
      const [row] = await db.execute<{ slug: string }>(sql`select slugify(${text}) as slug`)
      expect(row!.slug).toBe(slugify(text))
    }
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id, title: 'Đấu Phá Thương Khung' })
    const [row] = await db
      .select({ searchTitle: stories.searchTitle })
      .from(stories)
      .where(eq(stories.id, story.id))
    expect(row!.searchTitle).toBe('dau-pha-thuong-khung')
  })

  it('vi phạm check → 23514 (tên constraint như Supabase); trùng số chương → 23505', async () => {
    const owner = await registerUser(app)
    expect(
      await failure(
        db.insert(stories).values({ ownerId: owner.id, slug: `a-${randomLetters(8)}`, title: 'A' }),
      ),
    ).toMatchObject({ code: '23514', constraint_name: 'stories_title_check' })
    const story = await createStory(db, { ownerId: owner.id })
    expect(
      await failure(db.insert(chapters).values({ storyId: story.id, number: 1, content: 'x' })),
    ).toMatchObject({ code: '23505', constraint_name: 'chapters_story_id_number_key' })
    expect(
      await failure(
        db.insert(chapters).values({
          storyId: story.id,
          number: 2,
          content: 'x',
          status: 'published',
          scheduledAt: new Date(),
        }),
      ),
    ).toMatchObject({ code: '23514', constraint_name: 'chapters_scheduled_draft' })
  })
})

describe('thể loại có storyCount', () => {
  it('chỉ đếm truyện công khai có chương đã xuất bản', async () => {
    const owner = await registerUser(app)
    const genre = await createGenre(db)
    await createStory(db, { ownerId: owner.id, genres: [genre] })
    await createStory(db, { ownerId: owner.id, genres: [genre] })
    await createStory(db, { ownerId: owner.id, genres: [genre], visibility: 'draft' })
    await createStory(db, {
      ownerId: owner.id,
      genres: [genre],
      chapters: [{ number: 1, status: 'draft' }],
    })
    const { body } = await http().get(`/v1/genres/${genre}`).expect(200)
    expect(body.data.storyCount).toBe(2)
  })
})
