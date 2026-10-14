// Tạo người dùng và đọc refresh token trong test e2e. Mỗi lần gọi dùng email và IP riêng
// (X-Forwarded-For, test bật TRUST_PROXY_HOPS=1) để hạn mức theo email / IP không đụng nhau.
import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { RegisterUserInput, TestUser } from './helpers.types'

export const uniqueEmail = () => `u-${randomUUID()}@example.test`
export const uniqueIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`

/** Đăng ký (dạng mobile để nhận refresh token trong body) */
export async function registerUser(
  app: INestApplication,
  input: RegisterUserInput = {},
): Promise<TestUser> {
  const email = input.email ?? uniqueEmail()
  const password = input.password ?? 'mat-khau-bi-mat'
  const ip = uniqueIp()
  const res = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .set('X-Forwarded-For', ip)
    .set('X-Client', 'mobile')
    .send({ email, password, displayName: input.displayName ?? 'Người thử' })
    .expect(201)
  return {
    id: res.body.user.id,
    email,
    password,
    ip,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  }
}

/** Cookie refresh_token trong Set-Cookie của response (nguyên dòng) */
export function refreshCookieOf(res: request.Response) {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined
  return header?.find((cookie) => cookie.startsWith('refresh_token='))
}

/** Giá trị của cookie refresh_token */
export const cookieValue = (cookie: string) => cookie.split(';')[0]!.slice('refresh_token='.length)
