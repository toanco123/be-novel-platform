// Chấm điểm truyện: chấm, đổi, xóa; trigger phân bố sao; quyền và dữ liệu sai
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { stories, users } from '@/infra/database/schema'
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
const rate = (accessToken: string, slug: string, score: unknown) =>
  auth(http().put(`/v1/stories/${slug}/rating`), accessToken).send({ score })
const unrate = (accessToken: string, slug: string) =>
  auth(http().delete(`/v1/stories/${slug}/rating`), accessToken)
const myScore = async (accessToken: string, slug: string) =>
  (await auth(http().get(`/v1/stories/${slug}/rating`), accessToken).expect(200)).body.data.score
const summary = async (slug: string) => {
  const { ratingAvg, ratingCount, ratingCounts } = (
    await http().get(`/v1/stories/${slug}`).expect(200)
  ).body.data
  return { ratingAvg, ratingCount, ratingCounts }
}

describe('chấm điểm', () => {
  it('chấm, đổi, chấm lại cùng điểm, người khác chấm, xóa: phân bố sao đúng từng bước', async () => {
    const reader = await verifiedUser(app)
    const other = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    expect(await myScore(reader.accessToken, story.slug)).toBeNull()

    const res = await rate(reader.accessToken, story.slug, 4).expect(200)
    expect(res.body.data).toEqual({ score: 4 })
    expect(await summary(story.slug)).toEqual({
      ratingAvg: 4,
      ratingCount: 1,
      ratingCounts: [0, 0, 0, 1, 0],
    })

    await rate(reader.accessToken, story.slug, 2).expect(200)
    await rate(reader.accessToken, story.slug, 2).expect(200)
    expect(await myScore(reader.accessToken, story.slug)).toBe(2)
    expect(await summary(story.slug)).toEqual({
      ratingAvg: 2,
      ratingCount: 1,
      ratingCounts: [0, 1, 0, 0, 0],
    })

    await rate(other.accessToken, story.slug, 5).expect(200)
    expect(await summary(story.slug)).toMatchObject({ ratingAvg: 3.5, ratingCount: 2 })

    await unrate(reader.accessToken, story.slug).expect(204)
    await unrate(reader.accessToken, story.slug).expect(204)
    expect(await myScore(reader.accessToken, story.slug)).toBeNull()
    expect(await summary(story.slug)).toEqual({
      ratingAvg: 5,
      ratingCount: 1,
      ratingCounts: [0, 0, 0, 0, 1],
    })
  })

  it('người chấm xóa tài khoản: phân bố sao giảm theo; xóa truyện không lỗi', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    await rate(reader.accessToken, story.slug, 3).expect(200)
    await db.delete(users).where(eq(users.id, reader.id))
    expect(await summary(story.slug)).toMatchObject({ ratingCount: 0, ratingAvg: 0 })

    const other = await verifiedUser(app)
    await rate(other.accessToken, story.slug, 5).expect(200)
    await db.delete(stories).where(eq(stories.id, story.id))
    await http().get(`/v1/stories/${story.slug}`).expect(404)
  })
})

describe('quyền và dữ liệu sai', () => {
  it('chưa xác nhận email → 403 (xóa vẫn được); chưa đăng nhập → 401', async () => {
    const unverified = await registerUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    const res = await rate(unverified.accessToken, story.slug, 5).expect(403)
    expect(res.body.error.code).toBe('email_not_verified')
    await unrate(unverified.accessToken, story.slug).expect(204)
    await http().put(`/v1/stories/${story.slug}/rating`).send({ score: 5 }).expect(401)
  })

  it('truyện nháp của người khác → 404; chủ truyện chấm bản nháp của mình → 409', async () => {
    const reader = await verifiedUser(app)
    const owner = await verifiedUser(app)
    const draft = await createStory(db, { ownerId: owner.id, visibility: 'draft' })
    await rate(reader.accessToken, draft.slug, 5).expect(404)
    const res = await rate(owner.accessToken, draft.slug, 5).expect(409)
    expect(res.body.error.code).toBe('story_not_public')
  })

  it('điểm ngoài 1–5, số lẻ, chuỗi → 400', async () => {
    const reader = await verifiedUser(app)
    const owner = await registerUser(app)
    const story = await createStory(db, { ownerId: owner.id })
    for (const score of [0, 6, 2.5, '5', null]) {
      const res = await rate(reader.accessToken, story.slug, score).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })
})
