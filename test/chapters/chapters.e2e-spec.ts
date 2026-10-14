// Chương cho người đọc: mục lục, đọc chương (trước / sau), tải nhiều chương, ghi lượt đọc
import type { NestExpressApplication } from '@nestjs/platform-express'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { vietnamDate } from '@/common/utils/vietnam-date'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { chapterViews, storyStats } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { adminUser, registerUser, uniqueIp } from '../helpers/auth'
import { createStory } from '../helpers/stories'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const withToken = (req: request.Test, accessToken?: string) =>
  accessToken ? req.set('Authorization', `Bearer ${accessToken}`) : req

/** Truyện công khai có chương 1, 2 (nháp), 3, 5, 6 (nháp, hẹn giờ) */
async function storyWithGaps(ownerId: string) {
  return createStory(db, {
    ownerId,
    chapters: [
      { number: 1, title: 'Một' },
      { number: 2, title: 'Hai', status: 'draft' },
      { number: 3, title: 'Ba' },
      { number: 5, title: 'Năm' },
      { number: 6, title: 'Sáu', status: 'draft', scheduledAt: new Date(Date.now() + 3_600_000) },
    ],
  })
}

describe('mục lục', () => {
  it('chỉ chương đã xuất bản; thứ tự tăng / giảm; phân trang', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const asc = await http().get(`/v1/stories/${story.slug}/chapters`).expect(200)
    expect(asc.body.data).toEqual([
      { number: 1, title: 'Một', publishedAt: expect.any(String) },
      { number: 3, title: 'Ba', publishedAt: expect.any(String) },
      { number: 5, title: 'Năm', publishedAt: expect.any(String) },
    ])
    expect(asc.body.meta).toMatchObject({ total: 3, page: 1, pageSize: 20, pageCount: 1 })

    const desc = await http()
      .get(`/v1/stories/${story.slug}/chapters?order=desc&page=2&page_size=2`)
      .expect(200)
    expect(desc.body.data.map((c: { number: number }) => c.number)).toEqual([1])
    expect(desc.body.meta).toMatchObject({ total: 3, page: 2, pageSize: 2, pageCount: 2 })
  })

  it('from: chỉ chương có số ≥ from, meta.total là số chương từ đó', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const res = await http().get(`/v1/stories/${story.slug}/chapters?from=2&pageSize=1`).expect(200)
    expect(res.body.data.map((c: { number: number }) => c.number)).toEqual([3])
    expect(res.body.meta.total).toBe(2)
  })

  it('truyện nháp: khách → 404; chủ truyện thấy chương đã xuất bản; order sai → 400', async () => {
    const owner = await registerUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      visibility: 'draft',
      chapters: [{ number: 1 }, { number: 2, status: 'draft' }],
    })
    expect(
      (await http().get(`/v1/stories/${story.slug}/chapters`).expect(404)).body.error.code,
    ).toBe('not_found')
    const own = await withToken(http().get(`/v1/stories/${story.slug}/chapters`), owner.accessToken)
    expect(own.status).toBe(200)
    expect(own.body.data.map((c: { number: number }) => c.number)).toEqual([1])
    const bad = await http().get(`/v1/stories/${story.slug}/chapters?order=up`).expect(400)
    expect(bad.body.error.code).toBe('validation_failed')
  })
})

describe('đọc một chương', () => {
  it('đủ trường; chương trước / sau bỏ qua chương nháp và số bị bỏ trống', async () => {
    const owner = await registerUser(app, { displayName: 'Chủ truyện' })
    const story = await storyWithGaps(owner.id)
    const { body } = await http().get(`/v1/stories/${story.slug}/chapters/3`).expect(200)
    expect(body.data).toEqual({
      story: {
        slug: story.slug,
        title: story.title,
        author: { slug: `tac-gia-${owner.id}`, name: 'Chủ truyện' },
        status: 'ongoing',
        chapterCount: 3,
        coverUrl: null,
        visibility: 'published',
        nextChapter: { number: 6, at: expect.any(String) },
      },
      number: 3,
      title: 'Ba',
      content: '<p>Nội dung chương 3.</p>',
      publishedAt: expect.any(String),
      prev: { number: 1, title: 'Một' },
      next: { number: 5, title: 'Năm' },
    })
  })

  it('chương đầu không có chương trước, chương cuối không có chương sau', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const first = await http().get(`/v1/stories/${story.slug}/chapters/1`).expect(200)
    expect(first.body.data).toMatchObject({ prev: null, next: { number: 3 } })
    const last = await http().get(`/v1/stories/${story.slug}/chapters/5`).expect(200)
    expect(last.body.data).toMatchObject({ prev: { number: 3 }, next: null })
  })

  it('chương nháp, số không có → 404; số sai dạng → 400', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    await http().get(`/v1/stories/${story.slug}/chapters/2`).expect(404)
    // Chủ truyện cũng không đọc chương nháp ở trang đọc
    await withToken(http().get(`/v1/stories/${story.slug}/chapters/2`), owner.accessToken).expect(
      404,
    )
    await http().get(`/v1/stories/${story.slug}/chapters/4`).expect(404)
    for (const number of ['abc', '0', '100000', '1.5']) {
      const res = await http().get(`/v1/stories/${story.slug}/chapters/${number}`).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })

  it('truyện chờ duyệt: quản trị viên đọc được chương đã xuất bản, khách thì không', async () => {
    const owner = await registerUser(app)
    const admin = await adminUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      visibility: 'draft',
      reviewStatus: 'pending',
    })
    await http().get(`/v1/stories/${story.slug}/chapters/1`).expect(404)
    const res = await withToken(
      http().get(`/v1/stories/${story.slug}/chapters/1`),
      admin.accessToken,
    )
    expect(res.status).toBe(200)
    expect(res.body.data.story.visibility).toBe('draft')
  })
})

describe('tải nhiều chương', () => {
  it('đúng số lượng, chương trước / sau của chương đầu và cuối đợt', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const { body } = await http()
      .get(`/v1/stories/${story.slug}/chapters/contents?from=2&count=1`)
      .expect(200)
    expect(body.meta).toEqual({ requestId: expect.any(String) })
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      number: 3,
      content: '<p>Nội dung chương 3.</p>',
      prev: { number: 1, title: 'Một' },
      next: { number: 5, title: 'Năm' },
    })

    const all = await http().get(`/v1/stories/${story.slug}/chapters/contents?from=1`).expect(200)
    expect(
      all.body.data.map((c: { number: number; prev: unknown; next: unknown }) => [
        c.number,
        c.prev,
        c.next,
      ]),
    ).toEqual([
      [1, null, { number: 3, title: 'Ba' }],
      [3, { number: 1, title: 'Một' }, { number: 5, title: 'Năm' }],
      [5, { number: 3, title: 'Ba' }, null],
    ])
  })

  it('from sau chương cuối → mảng rỗng; count > 20 → 400; thiếu from → 400', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const empty = await http().get(`/v1/stories/${story.slug}/chapters/contents?from=6`).expect(200)
    expect(empty.body.data).toEqual([])
    await http().get(`/v1/stories/${story.slug}/chapters/contents?from=1&count=21`).expect(400)
    await http().get(`/v1/stories/${story.slug}/chapters/contents`).expect(400)
  })
})

// Ghi lượt đọc với IP giả (X-Forwarded-For), đọc lại số liệu trong DB
const view = (slug: string, number: number, ip: string, accessToken?: string) =>
  withToken(
    http().post(`/v1/stories/${slug}/chapters/${number}/views`).set('X-Forwarded-For', ip),
    accessToken,
  )
const viewCount = async (storyId: string) => {
  const [row] = await db
    .select({ viewCount: storyStats.viewCount })
    .from(storyStats)
    .where(eq(storyStats.storyId, storyId))
  return row!.viewCount
}
const todayViews = async (storyId: string, chapterNumber: number) => {
  const [row] = await db
    .select({ views: chapterViews.views })
    .from(chapterViews)
    .where(
      and(
        eq(chapterViews.storyId, storyId),
        eq(chapterViews.chapterNumber, chapterNumber),
        eq(chapterViews.day, vietnamDate()),
      ),
    )
  return row?.views ?? 0
}

describe('ghi lượt đọc', () => {
  it('khách: mỗi IP 1 lượt / chương / ngày; IP khác, chương khác tính riêng', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const ip = uniqueIp()
    await view(story.slug, 1, ip).expect(204)
    await view(story.slug, 1, ip).expect(204)
    expect(await viewCount(story.id)).toBe(1)
    expect(await todayViews(story.id, 1)).toBe(1)

    await view(story.slug, 1, uniqueIp()).expect(204)
    await view(story.slug, 3, ip).expect(204)
    expect(await viewCount(story.id)).toBe(3)
    expect(await todayViews(story.id, 1)).toBe(2)
    expect(await todayViews(story.id, 3)).toBe(1)
  })

  it('người đăng nhập tính theo tài khoản, riêng với khách cùng IP', async () => {
    const owner = await registerUser(app)
    const reader = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    const ip = uniqueIp()
    await view(story.slug, 1, ip).expect(204)
    await view(story.slug, 1, ip, reader.accessToken).expect(204)
    await view(story.slug, 1, uniqueIp(), reader.accessToken).expect(204)
    expect(await viewCount(story.id)).toBe(2)
  })

  it('không tính chủ truyện và truyện chưa công khai', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    await view(story.slug, 1, uniqueIp(), owner.accessToken).expect(204)
    expect(await viewCount(story.id)).toBe(0)

    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await view(draft.slug, 1, uniqueIp(), owner.accessToken).expect(204)
    expect(await viewCount(draft.id)).toBe(0)
    // Người khác không thấy truyện nháp
    await view(draft.slug, 1, uniqueIp()).expect(404)
  })

  it('chương nháp, chương không có → 404, không tính', async () => {
    const owner = await registerUser(app)
    const story = await storyWithGaps(owner.id)
    await view(story.slug, 2, uniqueIp()).expect(404)
    await view(story.slug, 4, uniqueIp()).expect(404)
    expect(await viewCount(story.id)).toBe(0)
  })
})
