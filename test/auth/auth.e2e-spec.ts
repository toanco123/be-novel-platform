// Đăng ký, đăng nhập, /v1/me, hạn mức, khóa tài khoản, hash bcrypt cũ (Postgres, Redis thật)
import type { NestExpressApplication } from '@nestjs/platform-express'
import { hash as bcryptHash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { profiles, users } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { refreshCookieOf, registerUser, uniqueEmail, uniqueIp } from '../helpers/auth'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())

const login = (email: string, password: string, ip = uniqueIp()) =>
  http().post('/v1/auth/login').set('X-Forwarded-For', ip).send({ email, password })

/** Chuỗi JSON không được chứa hash mật khẩu hay refresh token */
const expectNoSecrets = (body: unknown, refreshToken?: string) => {
  const json = JSON.stringify(body)
  expect(json).not.toMatch(/password|argon2|\$2[aby]\$/i)
  if (refreshToken) expect(json).not.toContain(refreshToken)
}

describe('đăng ký', () => {
  it('web: trả user + access token, refresh token nằm trong cookie HttpOnly', async () => {
    const email = uniqueEmail()
    const res = await http()
      .post('/v1/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email, password: 'mat-khau-bi-mat', displayName: '  Linh  ' })
      .expect(201)

    expect(res.body).toEqual({
      data: {
        user: {
          id: expect.any(String),
          email,
          displayName: 'Linh',
          avatarUrl: null,
          role: 'user',
          emailVerified: false,
          createdAt: expect.any(String),
        },
        accessToken: expect.any(String),
        expiresIn: 900,
      },
      meta: { requestId: res.headers['x-request-id'] },
    })
    const cookie = refreshCookieOf(res)
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Path=\/v1\/auth/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expectNoSecrets(res.body)
  })

  it('mobile (X-Client: mobile): refresh token trong body, không đặt cookie', async () => {
    const res = await http()
      .post('/v1/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .set('X-Client', 'mobile')
      .send({ email: uniqueEmail(), password: 'mat-khau-bi-mat', displayName: 'Linh' })
      .expect(201)
    expect(res.body.data.refreshToken).toEqual(expect.any(String))
    expect(refreshCookieOf(res)).toBeUndefined()
  })

  it('body snake_case (display_name) cũng được; response luôn camelCase', async () => {
    const res = await http()
      .post('/v1/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: uniqueEmail(), password: 'mat-khau-bi-mat', display_name: 'Snake' })
      .expect(201)
    expect(res.body.data.user.displayName).toBe('Snake')
    expect(Object.keys(res.body.data.user).toSorted()).toEqual([
      'avatarUrl',
      'createdAt',
      'displayName',
      'email',
      'emailVerified',
      'id',
      'role',
    ])
  })

  it('đăng ký → /v1/me → sửa tên hiển thị', async () => {
    const user = await registerUser(app, { displayName: 'Tên cũ' })
    const me = await http()
      .get('/v1/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200)
    expect(me.body.data).toMatchObject({ id: user.id, email: user.email, displayName: 'Tên cũ' })
    // Chỉ các trường của MeDto (không có bannedUntil, passwordHash...)
    expect(Object.keys(me.body.data).toSorted()).toEqual([
      'avatarUrl',
      'createdAt',
      'displayName',
      'email',
      'emailVerified',
      'id',
      'role',
    ])
    expectNoSecrets(me.body)

    const updated = await http()
      .patch('/v1/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ displayName: '  Tên mới  ' })
      .expect(200)
    expect(updated.body.data.displayName).toBe('Tên mới')

    const tooShort = await http()
      .patch('/v1/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ displayName: ' a ' })
      .expect(400)
    expect(tooShort.body.code).toBe('validation_failed')
  })

  it('email trùng (khác hoa thường) → 409 email_taken', async () => {
    const user = await registerUser(app)
    const res = await http()
      .post('/v1/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: user.email.toUpperCase(), password: 'mat-khau-khac', displayName: 'Khác' })
      .expect(409)
    expect(res.body.code).toBe('email_taken')
  })

  it('mật khẩu ngắn, email sai, tên quá ngắn → 400 validation_failed', async () => {
    for (const body of [
      { email: uniqueEmail(), password: 'ngan', displayName: 'Linh' },
      { email: 'khong-phai-email', password: 'mat-khau-bi-mat', displayName: 'Linh' },
      { email: uniqueEmail(), password: 'mat-khau-bi-mat', displayName: 'L' },
    ]) {
      const res = await http()
        .post('/v1/auth/register')
        .set('X-Forwarded-For', uniqueIp())
        .send(body)
        .expect(400)
      expect(res.body.code).toBe('validation_failed')
    }
  })

  it('quá 5 lần / giờ cùng IP → 429 rate_limited', async () => {
    const ip = uniqueIp()
    const register = () =>
      http()
        .post('/v1/auth/register')
        .set('X-Forwarded-For', ip)
        .send({ email: uniqueEmail(), password: 'mat-khau-bi-mat', displayName: 'Linh' })
    for (let i = 0; i < 5; i++) await register().expect(201)
    const res = await register().expect(429)
    expect(res.body).toMatchObject({
      code: 'rate_limited',
      details: { retryAfterSeconds: expect.any(Number) },
    })
  })
})

describe('đăng nhập', () => {
  it('đúng mật khẩu (email khác hoa thường) → 200, ghi last_sign_in_at', async () => {
    const user = await registerUser(app)
    const res = await login(`  ${user.email.toUpperCase()} `, user.password).expect(200)
    expect(res.body.data.user.id).toBe(user.id)
    expect(refreshCookieOf(res)).toBeDefined()
    const [row] = await db.select().from(users).where(eq(users.id, user.id))
    expect(row!.lastSignInAt).toBeInstanceOf(Date)
  })

  it('sai mật khẩu hoặc email không tồn tại → cùng 401 invalid_credentials', async () => {
    const user = await registerUser(app)
    const wrong = await login(user.email, 'mat-khau-sai').expect(401)
    const missing = await login(uniqueEmail(), 'mat-khau-sai').expect(401)
    expect(wrong.body.code).toBe('invalid_credentials')
    expect(missing.body.code).toBe('invalid_credentials')
    expect(wrong.body.message).toBe(missing.body.message)
  })

  it('sai 5 lần theo email → lần thứ 6 rate_limited, kể cả đúng mật khẩu', async () => {
    const user = await registerUser(app)
    for (let i = 0; i < 5; i++) {
      const res = await login(user.email, 'mat-khau-sai').expect(401)
      expect(res.body.code).toBe('invalid_credentials')
    }
    const blocked = await login(user.email, user.password).expect(429)
    expect(blocked.body).toMatchObject({
      code: 'rate_limited',
      details: { retryAfterSeconds: expect.any(Number) },
    })
  })

  it('đăng nhập đúng thì xóa đếm số lần sai theo email', async () => {
    const user = await registerUser(app)
    for (let i = 0; i < 4; i++) await login(user.email, 'mat-khau-sai').expect(401)
    await login(user.email, user.password).expect(200)
    for (let i = 0; i < 4; i++) await login(user.email, 'mat-khau-sai').expect(401)
    await login(user.email, user.password).expect(200)
  })

  it('sai 20 lần cùng IP (nhiều email) → rate_limited', async () => {
    const ip = uniqueIp()
    for (let i = 0; i < 20; i++) await login(uniqueEmail(), 'mat-khau-sai', ip).expect(401)
    const res = await login(uniqueEmail(), 'mat-khau-sai', ip).expect(429)
    expect(res.body.code).toBe('rate_limited')
  })

  it('tài khoản bị khóa → 403 account_banned khi đăng nhập và refresh', async () => {
    const user = await registerUser(app)
    const bannedUntil = new Date(Date.now() + 86_400_000)
    await db.update(users).set({ bannedUntil }).where(eq(users.id, user.id))

    const res = await login(user.email, user.password).expect(403)
    expect(res.body).toMatchObject({
      code: 'account_banned',
      details: { bannedUntil: bannedUntil.toISOString() },
    })
    // Sai mật khẩu thì không lộ việc bị khóa
    expect((await login(user.email, 'mat-khau-sai').expect(401)).body.code).toBe(
      'invalid_credentials',
    )

    const refresh = await http()
      .post('/v1/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: user.refreshToken })
      .expect(403)
    expect(refresh.body.code).toBe('account_banned')
    // Phiên bị thu hồi luôn
    await db.update(users).set({ bannedUntil: null }).where(eq(users.id, user.id))
    const after = await http()
      .post('/v1/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: user.refreshToken })
      .expect(401)
    expect(after.body.code).toBe('invalid_token')
  })

  it('hết khóa (banned_until đã qua) thì đăng nhập được', async () => {
    const user = await registerUser(app)
    await db
      .update(users)
      .set({ bannedUntil: new Date(Date.now() - 1000) })
      .where(eq(users.id, user.id))
    await login(user.email, user.password).expect(200)
  })

  it('user chuyển từ Supabase (hash bcrypt $2a$) đăng nhập được, DB đổi sang argon2id', async () => {
    const email = uniqueEmail()
    const legacy = (await bcryptHash('mat-khau-cu', 4)).replace(/^\$2b\$/, '$2a$')
    const [user] = await db.insert(users).values({ email, passwordHash: legacy }).returning()
    await db.insert(profiles).values({ id: user!.id, displayName: 'Người cũ' })

    await login(email, 'mat-khau-cu').expect(200)
    const [row] = await db.select().from(users).where(eq(users.id, user!.id))
    expect(row!.passwordHash).toMatch(/^\$argon2id\$/)
    await login(email, 'mat-khau-cu').expect(200)
    expect((await login(email, 'mat-khau-sai').expect(401)).body.code).toBe('invalid_credentials')
  })

  it('tài khoản chỉ có OAuth (không có mật khẩu) → invalid_credentials', async () => {
    const email = uniqueEmail()
    const [user] = await db.insert(users).values({ email, passwordHash: null }).returning()
    await db.insert(profiles).values({ id: user!.id, displayName: 'Chỉ Google' })
    expect((await login(email, 'bat-ky-mat-khau').expect(401)).body.code).toBe(
      'invalid_credentials',
    )
  })
})
