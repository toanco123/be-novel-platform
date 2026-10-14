// Module mẫu genres: xem công khai, phân trang, tạo (đã xác nhận email), trùng, hạn mức, quản trị viên
import { randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { count } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { genres } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { adminUser, registerUser, verifiedUser } from '../helpers/auth'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
/** Tên riêng mỗi lần (chỉ chữ thường để slug đoán được) */
const letters = (n: number) =>
  randomUUID()
    .replace(/[^a-f]/g, '')
    .slice(0, n)
const uniqueName = () => `the loai ${letters(12)}`
const create = (accessToken: string, body: object) =>
  http().post('/v1/genres').set('Authorization', `Bearer ${accessToken}`).send(body)

describe('tạo thể loại', () => {
  it('đã xác nhận email: 201, tên chuẩn hóa, slug, người tạo', async () => {
    const user = await verifiedUser(app, { displayName: 'Tác giả A' })
    const raw = uniqueName()
    const res = await create(user.accessToken, {
      name: `  ${raw.replace(/ /g, '   ')} `,
      description: '  Mô tả  ',
    }).expect(201)
    expect(res.body.data).toEqual({
      slug: raw.replace(/ /g, '-'),
      name: raw.charAt(0).toUpperCase() + raw.slice(1),
      description: 'Mô tả',
      createdBy: { id: user.id, displayName: 'Tác giả A' },
      storyCount: 0,
      createdAt: expect.any(String),
    })
  })

  it('chưa đăng nhập → 401; chưa xác nhận email → 403 email_not_verified', async () => {
    expect(
      (await http().post('/v1/genres').send({ name: 'Kiếm hiệp' }).expect(401)).body.error.code,
    ).toBe('unauthenticated')
    const user = await registerUser(app)
    const res = await create(user.accessToken, { name: uniqueName() }).expect(403)
    expect(res.body.error.code).toBe('email_not_verified')
  })

  it('trùng tên khác dấu / hoa thường → 409 genre_exists kèm thể loại đang có', async () => {
    const user = await verifiedUser(app)
    const suffix = letters(8)
    const first = await create(user.accessToken, { name: `Ngôn tình ${suffix}` }).expect(201)
    const res = await create(user.accessToken, {
      name: `NGON TINH ${suffix.toUpperCase()}`,
    }).expect(409)
    expect(res.body.error).toMatchObject({
      code: 'genre_exists',
      details: { genre: { slug: first.body.data.slug, name: `Ngôn tình ${suffix}` } },
    })
  })

  it('tên chỉ có ký tự đặc biệt, quá ngắn, quá dài → 400 validation_failed', async () => {
    const user = await verifiedUser(app)
    for (const name of ['!!!', 'a', 'x'.repeat(31)]) {
      const res = await create(user.accessToken, { name }).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })

  it('tối đa 10 thể loại / ngày; lần thứ 11 → 429; tạo trùng không tính lượt', async () => {
    const user = await verifiedUser(app)
    const firstName = uniqueName()
    await create(user.accessToken, { name: firstName }).expect(201)
    await create(user.accessToken, { name: firstName }).expect(409)
    for (let i = 0; i < 9; i++) await create(user.accessToken, { name: uniqueName() }).expect(201)
    const res = await create(user.accessToken, { name: uniqueName() }).expect(429)
    expect(res.body.error.code).toBe('rate_limited')
  })

  it('quản trị viên không bị giới hạn', async () => {
    const admin = await adminUser(app)
    for (let i = 0; i < 11; i++) {
      await create(admin.accessToken, { name: uniqueName() }).expect(201)
    }
  })

  it('người tạo xóa tài khoản → createdBy thành null', async () => {
    const user = await verifiedUser(app)
    const { body } = await create(user.accessToken, { name: uniqueName() }).expect(201)
    await http()
      .delete('/v1/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ password: user.password })
      .expect(204)
    const res = await http().get(`/v1/genres/${body.data.slug}`).expect(200)
    expect(res.body.data.createdBy).toBeNull()
  })
})

describe('xem thể loại (công khai)', () => {
  it('một thể loại; không có → 404; có Cache-Control', async () => {
    const user = await verifiedUser(app)
    const { body } = await create(user.accessToken, { name: uniqueName() }).expect(201)
    const res = await http().get(`/v1/genres/${body.data.slug}`).expect(200)
    expect(res.body.data).toEqual(body.data)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
    expect((await http().get('/v1/genres/khong-co-the-loai-nay').expect(404)).body.error.code).toBe(
      'not_found',
    )
  })

  it('danh sách phân trang: meta đúng, thể loại có sẵn đứng trước', async () => {
    // Một thể loại có sẵn của hệ thống (không có người tạo)
    const systemSlug = `he-thong-${randomUUID().slice(0, 8)}`
    await db.insert(genres).values({ slug: systemSlug, name: 'Hệ thống' })
    const user = await verifiedUser(app)
    await create(user.accessToken, { name: uniqueName() }).expect(201)
    const [{ total }] = (await db.select({ total: count() }).from(genres)) as [{ total: number }]

    const res = await http().get('/v1/genres').query({ page: 1, page_size: 2 }).expect(200)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
    expect(res.body.meta).toEqual({
      total,
      page: 1,
      pageSize: 2,
      pageCount: Math.ceil(total / 2),
      requestId: expect.any(String),
    })
    expect(res.body.data).toHaveLength(2)
    // Thể loại có sẵn (createdBy null) luôn đứng trước thể loại người dùng tạo
    const all = await http().get('/v1/genres').query({ pageSize: 100 }).expect(200)
    const firstUserMade = all.body.data.findIndex(
      (g: { createdBy: unknown }) => g.createdBy !== null,
    )
    const lastSystem = all.body.data
      .map((g: { createdBy: unknown }) => g.createdBy)
      .lastIndexOf(null)
    expect(lastSystem).toBeLessThan(firstUserMade === -1 ? Infinity : firstUserMade)
    expect(all.body.data.some((g: { slug: string }) => g.slug === systemSlug)).toBe(true)
  })

  it('tham số trang sai → 400; trang quá cuối → danh sách rỗng', async () => {
    for (const query of [{ page: 0 }, { page: 'abc' }, { pageSize: 101 }]) {
      const res = await http().get('/v1/genres').query(query).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
    const res = await http().get('/v1/genres').query({ page: 100_000 }).expect(200)
    expect(res.body.data).toEqual([])
  })
})
