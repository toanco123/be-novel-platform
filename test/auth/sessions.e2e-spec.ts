// Refresh token: xoay vòng, phát hiện dùng lại, cookie (web) / body (mobile), đăng xuất
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { DB, type Db } from '@/infra/database/db'
import { refreshTokens } from '@/infra/database/schema'
import { hashRefreshToken } from '@/modules/auth/refresh-token'
import { createTestApp } from '../helpers/app'
import { cookieValue, refreshCookieOf, registerUser, uniqueIp } from '../helpers/auth'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())

const refreshMobile = (refreshToken: string) =>
  http().post('/v1/auth/refresh').set('X-Client', 'mobile').send({ refreshToken })

/** Đẩy thời điểm token bị thay về quá khứ (quá khoảng ân hạn 10 giây) */
const ageRevocation = (refreshToken: string, ms: number) =>
  db
    .update(refreshTokens)
    .set({ revokedAt: new Date(Date.now() - ms) })
    .where(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)))

describe('refresh (mobile, token trong body)', () => {
  it('xoay vòng: token mới khác token cũ, access token dùng được', async () => {
    const user = await registerUser(app)
    const res = await refreshMobile(user.refreshToken).expect(200)
    expect(res.body).toMatchObject({
      user: { id: user.id },
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: 900,
    })
    expect(res.body.refreshToken).not.toBe(user.refreshToken)
    await http().get('/v1/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200)

    // DB chỉ có hash, cùng họ, hạn giữ nguyên
    const rows = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, user.id))
      .orderBy(refreshTokens.createdAt)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.tokenHash)).toEqual([
      hashRefreshToken(user.refreshToken),
      hashRefreshToken(res.body.refreshToken),
    ])
    expect(rows[1]!.familyId).toBe(rows[0]!.familyId)
    expect(rows[1]!.expiresAt).toEqual(rows[0]!.expiresAt)
    expect(rows[0]).toMatchObject({ revokedAt: expect.any(Date), replacedById: rows[1]!.id })
  })

  it('dùng lại token cũ ngay (hai tab): token_reused, phiên vẫn còn', async () => {
    const user = await registerUser(app)
    const next = (await refreshMobile(user.refreshToken).expect(200)).body.refreshToken
    expect((await refreshMobile(user.refreshToken).expect(401)).body.code).toBe('token_reused')
    await refreshMobile(next).expect(200)
  })

  it('dùng lại token cũ sau ân hạn: token_reused và cả phiên bị thu hồi', async () => {
    const user = await registerUser(app)
    const second = (await refreshMobile(user.refreshToken).expect(200)).body.refreshToken
    const third = (await refreshMobile(second).expect(200)).body.refreshToken
    await ageRevocation(user.refreshToken, 60_000)

    expect((await refreshMobile(user.refreshToken).expect(401)).body.code).toBe('token_reused')
    // Token mới nhất cũng hết hiệu lực
    expect((await refreshMobile(third).expect(401)).body.code).toBe('invalid_token')
  })

  it('phiên khác của cùng người không bị ảnh hưởng khi một phiên bị thu hồi', async () => {
    const user = await registerUser(app)
    const login = await http()
      .post('/v1/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .set('X-Client', 'mobile')
      .send({ email: user.email, password: user.password })
      .expect(200)
    await refreshMobile(user.refreshToken).expect(200)
    await ageRevocation(user.refreshToken, 60_000)
    await refreshMobile(user.refreshToken).expect(401)
    await refreshMobile(login.body.refreshToken).expect(200)
  })

  it('token rác, hết hạn → invalid_token; không gửi token → unauthenticated', async () => {
    expect((await refreshMobile('khong-ton-tai').expect(401)).body.code).toBe('invalid_token')

    const user = await registerUser(app)
    await db
      .update(refreshTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(refreshTokens.userId, user.id))
    expect((await refreshMobile(user.refreshToken).expect(401)).body.code).toBe('invalid_token')

    const none = await http().post('/v1/auth/refresh').expect(401)
    expect(none.body.code).toBe('unauthenticated')
  })

  it('access token cũ (kể cả hết hạn) gửi kèm không chặn refresh', async () => {
    const user = await registerUser(app)
    await refreshMobile(user.refreshToken).set('Authorization', 'Bearer token-het-han').expect(200)
  })
})

describe('refresh (web, cookie)', () => {
  it('refresh bằng cookie, nhận cookie mới; cookie cũ không dùng lại được', async () => {
    const register = await http()
      .post('/v1/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .send({
        email: `web-${Date.now()}@example.test`,
        password: 'mat-khau-bi-mat',
        displayName: 'Web',
      })
      .expect(201)
    const first = refreshCookieOf(register)!

    const res = await http()
      .post('/v1/auth/refresh')
      .set('Cookie', first.split(';')[0]!)
      .expect(200)
    expect(res.body.refreshToken).toBeUndefined()
    const second = refreshCookieOf(res)!
    expect(cookieValue(second)).not.toBe(cookieValue(first))
    expect(second).toMatch(/HttpOnly/)

    const reused = await http()
      .post('/v1/auth/refresh')
      .set('Cookie', first.split(';')[0]!)
      .expect(401)
    expect(reused.body.code).toBe('token_reused')
    // token_reused không xóa cookie (tab khác có thể vừa nhận cookie mới)
    expect(refreshCookieOf(reused)).toBeUndefined()
  })

  it('cookie không hợp lệ → invalid_token và xóa cookie', async () => {
    const res = await http().post('/v1/auth/refresh').set('Cookie', 'refresh_token=rac').expect(401)
    expect(res.body.code).toBe('invalid_token')
    expect(refreshCookieOf(res)).toMatch(/Expires=Thu, 01 Jan 1970/)
  })
})

describe('đăng xuất', () => {
  it('logout (body) thu hồi phiên; refresh sau đó → invalid_token', async () => {
    const user = await registerUser(app)
    await http().post('/v1/auth/logout').send({ refreshToken: user.refreshToken }).expect(204)
    expect((await refreshMobile(user.refreshToken).expect(401)).body.code).toBe('invalid_token')
  })

  it('logout (cookie) xóa cookie; token sai hoặc không có token vẫn 204', async () => {
    const res = await http().post('/v1/auth/logout').set('Cookie', 'refresh_token=rac').expect(204)
    expect(refreshCookieOf(res)).toMatch(/refresh_token=;.*Expires=Thu, 01 Jan 1970/)
    await http().post('/v1/auth/logout').expect(204)
  })

  it('logout-all thu hồi mọi phiên của người dùng', async () => {
    const user = await registerUser(app)
    const other = await http()
      .post('/v1/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .set('X-Client', 'mobile')
      .send({ email: user.email, password: user.password })
      .expect(200)

    await http()
      .post('/v1/auth/logout-all')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204)
    await refreshMobile(user.refreshToken).expect(401)
    await refreshMobile(other.body.refreshToken).expect(401)
  })

  it('logout-all cần đăng nhập', async () => {
    const res = await http().post('/v1/auth/logout-all').expect(401)
    expect(res.body.code).toBe('unauthenticated')
  })
})
