// Báo lỗi chương: báo, báo lại (cập nhật ghi chú), quyền, dữ liệu sai, hạn mức, cascade
import type { NestExpressApplication } from '@nestjs/platform-express'
import { and, eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { chapterReports, chapters } from '@/infra/database/schema'
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
const report = (accessToken: string, slug: string, number: number, body: object) =>
  http()
    .post(`/v1/stories/${slug}/chapters/${number}/reports`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body)
const reportsOf = (storyId: string) =>
  db
    .select({ id: chapterReports.id, reason: chapterReports.reason, note: chapterReports.note })
    .from(chapterReports)
    .where(eq(chapterReports.storyId, storyId))

describe('báo lỗi chương', () => {
  it('báo lỗi → 201 đủ trường; báo lại cùng lý do cập nhật ghi chú; khác lý do thì dòng mới', async () => {
    const reader = await verifiedUser(app, { displayName: 'Người đọc' })
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id, chapters: [{ number: 3 }] })
    const first = await report(reader.accessToken, story.slug, 3, {
      reason: 'typo',
      note: '  Sai chính tả dòng 2  ',
    }).expect(201)
    expect(first.body.data).toEqual({
      id: expect.any(String),
      storySlug: story.slug,
      chapterNumber: 3,
      reason: 'typo',
      note: 'Sai chính tả dòng 2',
      reporter: { id: reader.id, displayName: 'Người đọc' },
      status: 'open',
      createdAt: expect.any(String),
    })
    const again = await report(reader.accessToken, story.slug, 3, {
      reason: 'typo',
      note: 'Cả dòng 5 nữa',
    }).expect(201)
    expect(again.body.data).toMatchObject({ id: first.body.data.id, note: 'Cả dòng 5 nữa' })
    expect(Date.parse(again.body.data.createdAt)).toBeGreaterThanOrEqual(
      Date.parse(first.body.data.createdAt),
    )
    await report(reader.accessToken, story.slug, 3, { reason: 'missing' }).expect(201)
    expect((await reportsOf(story.id)).map((r) => r.reason).toSorted()).toEqual(['missing', 'typo'])
  })

  it('quyền: chưa xác nhận email → 403; truyện nháp → 404 / 409; chương nháp, không có → 404', async () => {
    const unverified = await registerUser(app)
    const reader = await verifiedUser(app)
    const owner = await verifiedUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: [{ number: 1 }, { number: 2, status: 'draft' }],
    })
    expect(
      (await report(unverified.accessToken, story.slug, 1, { reason: 'typo' }).expect(403)).body
        .error.code,
    ).toBe('email_not_verified')
    await report(reader.accessToken, story.slug, 2, { reason: 'typo' }).expect(404)
    await report(reader.accessToken, story.slug, 9, { reason: 'typo' }).expect(404)
    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await report(reader.accessToken, draft.slug, 1, { reason: 'typo' }).expect(404)
    expect(
      (await report(owner.accessToken, draft.slug, 1, { reason: 'typo' }).expect(409)).body.error
        .code,
    ).toBe('story_not_public')
  })

  it('other thiếu ghi chú, lý do lạ, ghi chú quá dài → 400', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    for (const body of [
      { reason: 'other' },
      { reason: 'other', note: '  ' },
      { reason: 'boring' },
      { reason: 'typo', note: 'x'.repeat(501) },
    ]) {
      const res = await report(reader.accessToken, story.slug, 1, body).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })

  it('báo lỗi mới thứ 11 trong giờ → 429; báo lại vẫn được; xóa chương thì báo lỗi mất theo', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, {
      ownerId: owner.id,
      chapters: Array.from({ length: 11 }, (_, i) => ({ number: i + 1 })),
    })
    for (let n = 1; n <= 10; n++) {
      await report(reader.accessToken, story.slug, n, { reason: 'typo' }).expect(201)
    }
    const limited = await report(reader.accessToken, story.slug, 11, { reason: 'typo' }).expect(429)
    expect(limited.body.error.code).toBe('rate_limited')
    await report(reader.accessToken, story.slug, 1, { reason: 'typo', note: 'Thêm' }).expect(201)

    await db.delete(chapters).where(and(eq(chapters.storyId, story.id), eq(chapters.number, 1)))
    expect(await reportsOf(story.id)).toHaveLength(9)
  })
})
