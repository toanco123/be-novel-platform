// Khung app dựng bằng createApp như production, cộng một controller chỉ dùng trong test để kiểm tra
// validate, định dạng lỗi và OpenAPI
import { Body, Controller, Get, Module, Post } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { z } from 'zod'
import { createZodDto } from '@/core/http/zod-dto'
import { AppModule } from '@/app.module'
import { Public } from '@/core/auth/auth.decorators'
import { AppError } from '@/core/errors/app-error'
import { createTestApp } from './helpers/app'

class EchoDto extends createZodDto(z.object({ name: z.string().min(2).max(20) })) {}

@Public()
@Controller('test-only')
class TestOnlyController {
  @Post('echo')
  echo(@Body() body: EchoDto) {
    return body
  }

  @Get('boom')
  boom() {
    throw new Error('chi tiết nội bộ không được lộ')
  }

  @Get('conflict')
  conflict() {
    throw new AppError('conflict', { reason: 'test' })
  }
}

@Module({ imports: [AppModule], controllers: [TestOnlyController] })
class TestAppModule {}

let app: NestExpressApplication

beforeAll(async () => {
  app = await createTestApp(TestAppModule)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())

test('/health/live trả ok, không có tiền tố phiên bản', async () => {
  const res = await http().get('/health/live').expect(200)
  expect(res.body).toEqual({ status: 'ok' })
  expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
})

test('route không có: 404 not_found, requestId khớp header client gửi', async () => {
  const res = await http().get('/v1/khong-co').set('x-request-id', 'req-123').expect(404)
  expect(res.body).toEqual({
    code: 'not_found',
    message: 'Resource not found',
    requestId: 'req-123',
  })
  expect(res.headers['x-request-id']).toBe('req-123')
})

test('body sai: 400 validation_failed kèm issue; đúng thì qua', async () => {
  const bad = await http().post('/v1/test-only/echo').send({ name: 'a' }).expect(400)
  expect(bad.body).toMatchObject({
    code: 'validation_failed',
    details: { issues: [expect.objectContaining({ path: 'name', code: 'too_small' })] },
    requestId: expect.any(String),
  })
  await http().post('/v1/test-only/echo').send({ name: 'Linh' }).expect(201, { name: 'Linh' })
})

test('JSON hỏng: 400 bad_request; body quá 1 MB: 413 payload_too_large', async () => {
  const broken = await http()
    .post('/v1/test-only/echo')
    .set('content-type', 'application/json')
    .send('{"name":')
    .expect(400)
  expect(broken.body.code).toBe('bad_request')
  const big = await http()
    .post('/v1/test-only/echo')
    .send({ name: 'x'.repeat(1_100_000) })
    .expect(413)
  expect(big.body.code).toBe('payload_too_large')
})

test('AppError giữ mã và details; lỗi lạ thành 500 không lộ chi tiết', async () => {
  const conflict = await http().get('/v1/test-only/conflict').expect(409)
  expect(conflict.body).toMatchObject({ code: 'conflict', details: { reason: 'test' } })
  const boom = await http().get('/v1/test-only/boom').expect(500)
  expect(boom.body).toEqual({
    code: 'internal_error',
    message: 'Internal server error',
    requestId: expect.any(String),
  })
})

test('/openapi.json có endpoint và schema DTO zod', async () => {
  const res = await http().get('/openapi.json').expect(200)
  expect(Object.keys(res.body.paths)).toEqual(
    expect.arrayContaining(['/health/live', '/v1/test-only/echo']),
  )
  expect(JSON.stringify(res.body.components.schemas)).toContain('"minLength":2')
})

test('/openapi.json: route cần đăng nhập có bearer, nullable đúng dạng OpenAPI 3.0', async () => {
  const { body } = await http().get('/openapi.json').expect(200)
  expect(body.components.securitySchemes.bearer).toMatchObject({ type: 'http', scheme: 'bearer' })
  expect(body.paths['/v1/me'].get.security).toEqual([{ bearer: [] }])
  expect(body.paths['/v1/auth/login'].post.security).toBeUndefined()
  // zod sinh type: ['string', 'null'], Nest hiểu nhầm thành mảng (xem core/http/zod-dto.ts)
  expect(body.components.schemas.MeDto.properties.avatarUrl).toEqual({
    type: 'string',
    nullable: true,
  })
  expect(JSON.stringify(body)).not.toMatch(/"type":\[/)
})

test('CORS: origin trong danh sách được phép, origin lạ không có header cho phép', async () => {
  const allowed = await http().get('/health/live').set('origin', 'http://allowed.test').expect(200)
  expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.test')
  expect(allowed.headers['access-control-allow-credentials']).toBe('true')
  const other = await http().get('/health/live').set('origin', 'http://evil.test').expect(200)
  expect(other.headers['access-control-allow-origin']).toBeUndefined()
})
