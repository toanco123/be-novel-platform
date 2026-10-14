// Hạn mức nghiệp vụ (RateLimitService) và chặn spam thô (throttler) trên Redis thật
import { randomUUID } from 'node:crypto'
import { Controller, Get, Module } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import request from 'supertest'
import { AppModule } from '@/app.module'
import { Public } from '@/core/auth/auth.decorators'
import { AppError } from '@/core/errors/app-error'
import { RateLimitService } from '@/core/rate-limit/rate-limit.service'
import { createTestApp } from '../helpers/app'

@Public()
@Controller('test-throttle')
class TestThrottleController {
  @Get()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  hit() {
    return { ok: true }
  }
}

@Module({ imports: [AppModule], controllers: [TestThrottleController] })
class TestThrottleModule {}

let app: NestExpressApplication
let limits: RateLimitService

beforeAll(async () => {
  app = await createTestApp(TestThrottleModule)
  limits = app.get(RateLimitService)
})
afterAll(() => app.close())

/** Key riêng mỗi test để các test không đụng nhau */
const key = () => `test:${randomUUID()}`

test('đủ lượt thì qua, lượt thứ limit + 1 thì rate_limited kèm retryAfterSeconds', async () => {
  const k = key()
  const opts = { limit: 3, windowSeconds: 60 }
  for (let i = 1; i <= 3; i++) {
    expect(await limits.consume(k, opts)).toMatchObject({
      allowed: true,
      used: i,
      remaining: 3 - i,
    })
  }
  const error = await limits.consume(k, opts).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(AppError)
  expect(error).toMatchObject({ code: 'rate_limited', details: { retryAfterSeconds: 60 } })
})

test('hết cửa sổ thì được dùng lại', async () => {
  const k = key()
  const opts = { limit: 1, windowSeconds: 1 }
  await limits.consume(k, opts)
  await expect(limits.consume(k, opts)).rejects.toMatchObject({ code: 'rate_limited' })
  await new Promise((resolve) => setTimeout(resolve, 1100))
  await expect(limits.consume(k, opts)).resolves.toMatchObject({ allowed: true, used: 1 })
})

test('peek không tính lượt; reset xóa đếm; key khác nhau độc lập', async () => {
  const a = key()
  const b = key()
  const opts = { limit: 2, windowSeconds: 60 }
  await limits.consume(a, opts)
  expect(await limits.peek(a, opts)).toMatchObject({ allowed: true, used: 1, remaining: 1 })
  expect(await limits.peek(a, opts)).toMatchObject({ used: 1 })
  expect(await limits.peek(b, opts)).toMatchObject({ used: 0, remaining: 2 })
  await limits.consume(a, opts)
  expect(await limits.peek(a, opts)).toMatchObject({ allowed: false, remaining: 0 })
  await limits.reset(a)
  expect(await limits.peek(a, opts)).toMatchObject({ allowed: true, used: 0 })
})

test('throttler: route giới hạn 3 lần, lần 4 trả 429 rate_limited có Retry-After', async () => {
  const http = request(app.getHttpServer())
  for (let i = 0; i < 3; i++) await http.get('/v1/test-throttle').expect(200)
  const res = await http.get('/v1/test-throttle').expect(429)
  expect(res.body).toMatchObject({ code: 'rate_limited', requestId: expect.any(String) })
  expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
})

test('health check không bị throttler tính', async () => {
  const http = request(app.getHttpServer())
  for (let i = 0; i < 5; i++) await http.get('/health/live').expect(200)
})

test('/health/ready kiểm tra cả DB và Redis', async () => {
  const res = await request(app.getHttpServer()).get('/health/ready').expect(200)
  expect(res.body).toMatchObject({
    status: 'ok',
    info: { database: { status: 'up' }, redis: { status: 'up' } },
  })
})
