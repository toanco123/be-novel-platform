// Guard toàn cục: JwtAuthGuard (mặc định cần đăng nhập), @Public(), @Roles(), throttler theo user
import { Controller, Get, Module } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { AppModule } from '@/app.module'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { Roles } from '@/common/auth/decorators/roles.decorator'
import { TokenService } from '@/common/auth/token.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { users } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { registerUser, uniqueIp } from '../helpers/auth'

@Controller('test-auth')
class TestAuthController {
  @Get('public')
  @Public()
  whoAmI(@CurrentUser() actor?: Actor) {
    return { actor: actor ?? null }
  }

  @Get('private')
  privateRoute(@CurrentUser() actor: Actor) {
    return { actor }
  }

  @Get('admin')
  @Roles('admin')
  admin() {
    return { ok: true }
  }

  @Get('verified')
  @RequireVerifiedEmail()
  verifiedOnly() {
    return { ok: true }
  }

  @Get('throttled')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  throttled() {
    return { ok: true }
  }
}

@Module({ imports: [AppModule], controllers: [TestAuthController] })
class TestAuthModule {}

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp(TestAuthModule)
  db = app.get(DB)
})
afterAll(async () => {
  vi.useRealTimers()
  await app.close()
})

const http = () => request(app.getHttpServer())
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const hit = (token: string, from: string) =>
  http().get('/v1/test-auth/throttled').set(bearer(token)).set('X-Forwarded-For', from)

it('route mặc định: không có token → 401 unauthenticated', async () => {
  const res = await http().get('/v1/test-auth/private').expect(401)
  expect(res.body).toMatchObject({
    statusCode: 401,
    error: { code: 'unauthenticated' },
    meta: { requestId: expect.any(String) },
  })
  expect((await http().get('/v1/me').expect(401)).body.error.code).toBe('unauthenticated')
})

it('token đúng → gắn người gọi { id, role, sessionId }', async () => {
  const user = await registerUser(app)
  const res = await http().get('/v1/test-auth/private').set(bearer(user.accessToken)).expect(200)
  expect(res.body.actor).toEqual({
    id: user.id,
    role: 'user',
    sessionId: expect.any(String),
    emailVerified: false,
  })
})

it('token rác, sai scheme, hết hạn → 401 invalid_token', async () => {
  for (const header of ['Bearer khong-phai-jwt', 'Basic abc', 'Bearer']) {
    const res = await http().get('/v1/test-auth/private').set('Authorization', header).expect(401)
    expect(res.body.error.code).toBe('invalid_token')
  }

  const user = await registerUser(app)
  // Ký token ở quá khứ (hết hạn sau 15 phút)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.now() - 3_600_000)
  const expired = await app
    .get(TokenService)
    .signAccessToken({ id: user.id, role: 'user', sessionId: 'old', emailVerified: false })
  vi.useRealTimers()
  const res = await http().get('/v1/test-auth/private').set(bearer(expired)).expect(401)
  expect(res.body.error.code).toBe('invalid_token')
})

it('route @Public(): khách gọi được; token đúng thì vẫn biết người gọi; token sai → invalid_token', async () => {
  expect((await http().get('/v1/test-auth/public').expect(200)).body).toEqual({ actor: null })

  const user = await registerUser(app)
  const res = await http().get('/v1/test-auth/public').set(bearer(user.accessToken)).expect(200)
  expect(res.body.actor.id).toBe(user.id)

  const bad = await http().get('/v1/test-auth/public').set(bearer('rac')).expect(401)
  expect(bad.body.error.code).toBe('invalid_token')
})

it('@Roles("admin"): user thường → 403 forbidden, admin → 200', async () => {
  const user = await registerUser(app)
  const res = await http().get('/v1/test-auth/admin').set(bearer(user.accessToken)).expect(403)
  expect(res.body.error.code).toBe('forbidden')
  await http().get('/v1/test-auth/admin').expect(401)

  // Vai trò lấy từ DB khi đăng nhập / refresh
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
  const login = await http()
    .post('/v1/auth/login')
    .set('X-Forwarded-For', uniqueIp())
    .send({ email: user.email, password: user.password })
    .expect(200)
  expect(login.body.data.user.role).toBe('admin')
  await http().get('/v1/test-auth/admin').set(bearer(login.body.data.accessToken)).expect(200)
})

it('throttler đếm theo người dùng (đổi IP không qua được), người khác cùng IP không bị ảnh hưởng', async () => {
  const [a, b] = [await registerUser(app), await registerUser(app)]
  const ip = uniqueIp()
  await hit(a.accessToken, ip).expect(200)
  await hit(a.accessToken, uniqueIp()).expect(200)
  expect((await hit(a.accessToken, uniqueIp()).expect(429)).body.error.code).toBe('rate_limited')
  await hit(b.accessToken, ip).expect(200)
})

it('@RequireVerifiedEmail: chưa xác nhận → 403 email_not_verified; xác nhận rồi refresh → 200', async () => {
  const user = await registerUser(app)
  const res = await http().get('/v1/test-auth/verified').set(bearer(user.accessToken)).expect(403)
  expect(res.body.error.code).toBe('email_not_verified')

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id))
  // Token cũ chưa có ev = true; refresh để nhận token mới
  await http().get('/v1/test-auth/verified').set(bearer(user.accessToken)).expect(403)
  const refreshed = await http()
    .post('/v1/auth/refresh')
    .set('X-Client', 'mobile')
    .send({ refreshToken: user.refreshToken })
    .expect(200)
  await http()
    .get('/v1/test-auth/verified')
    .set(bearer(refreshed.body.data.accessToken))
    .expect(200)
})

it('health check không cần đăng nhập', async () => {
  await http().get('/health/live').expect(200)
})
