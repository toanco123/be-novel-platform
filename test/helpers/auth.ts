// Tạo người dùng và đọc refresh token trong test e2e. Mỗi lần gọi dùng email và IP riêng
// (X-Forwarded-For, test bật TRUST_PROXY_HOPS=1) để hạn mức theo email / IP không đụng nhau.
import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { users } from '@/infra/database/schema'
import type { RegisterUserInput, TestUser } from './helpers.types'

export const uniqueEmail = () => `u-${randomUUID()}@example.test`
export const uniqueIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`

/** Đăng ký (dạng mobile để nhận refresh token trong body) */
export async function registerUser(
  app: INestApplication,
  input: RegisterUserInput = {},
): Promise<TestUser> {
  const email = input.email ?? uniqueEmail()
  const password = input.password ?? 'mat-khau-123'
  const ip = uniqueIp()
  const res = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .set('X-Forwarded-For', ip)
    .set('X-Client', 'mobile')
    .send({ email, password, displayName: input.displayName ?? 'Người thử' })
    .expect(201)
  return {
    id: res.body.data.user.id,
    email,
    password,
    ip,
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  }
}

/** Cookie refresh_token trong Set-Cookie của response (nguyên dòng) */
export function refreshCookieOf(res: request.Response) {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined
  return header?.find((cookie) => cookie.startsWith('refresh_token='))
}

/** Giá trị của cookie refresh_token */
export const cookieValue = (cookie: string) => cookie.split(';')[0]!.slice('refresh_token='.length)

/** Người dùng đã xác nhận email (thao tác viết): access token mới có ev = true */
export async function verifiedUser(app: INestApplication, input: RegisterUserInput = {}) {
  const user = await registerUser(app, input)
  await app
    .get<Db>(DB)
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, user.id))
  const res = await request(app.getHttpServer())
    .post('/v1/auth/refresh')
    .set('X-Client', 'mobile')
    .send({ refreshToken: user.refreshToken })
    .expect(200)
  return {
    ...user,
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
  }
}

/** Quản trị viên (đã xác nhận email): access token mới có role = admin */
export async function adminUser(app: INestApplication, input: RegisterUserInput = {}) {
  const user = await verifiedUser(app, input)
  await app.get<Db>(DB).update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
  const res = await request(app.getHttpServer())
    .post('/v1/auth/refresh')
    .set('X-Client', 'mobile')
    .send({ refreshToken: user.refreshToken })
    .expect(200)
  return {
    ...user,
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
  }
}
