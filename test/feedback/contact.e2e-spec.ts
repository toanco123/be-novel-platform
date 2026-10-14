// Tin nhắn liên hệ: khách / người đăng nhập gửi, IP băm có khóa, hạn mức theo email và IP, dữ liệu sai
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { IpHashService } from '@/common/crypto/ip-hash.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { contactMessages } from '@/infra/database/schema'
import { createTestApp } from '../helpers/app'
import { registerUser, uniqueEmail, uniqueIp } from '../helpers/auth'

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  db = app.get(DB)
})
afterAll(() => app.close())

const send = (body: object, ip: string, accessToken?: string) => {
  const req = request(app.getHttpServer())
    .post('/v1/contact-messages')
    .set('X-Forwarded-For', ip)
    .send(body)
  return accessToken ? req.set('Authorization', `Bearer ${accessToken}`) : req
}
const message = (email: string, extra: object = {}) => ({
  name: '  Linh  ',
  email,
  topic: 'bug',
  message: 'Trang đọc bị lỗi font chữ.',
  ...extra,
})
const rowsOf = (email: string) =>
  db.select().from(contactMessages).where(eq(contactMessages.email, email))

describe('tin nhắn liên hệ', () => {
  it('khách gửi: lưu IP đã băm, không có user_id; người đăng nhập: có user_id', async () => {
    const email = uniqueEmail()
    const ip = uniqueIp()
    await send(message(email.toUpperCase()), ip).expect(204)
    const [row] = await rowsOf(email)
    expect(row).toMatchObject({
      userId: null,
      name: 'Linh',
      email,
      topic: 'bug',
      message: 'Trang đọc bị lỗi font chữ.',
      handledAt: null,
    })
    expect(row!.ipHash).toBe(app.get(IpHashService).hash(ip))
    expect(row!.ipHash).not.toContain(ip)

    const user = await registerUser(app)
    const other = uniqueEmail()
    await send(message(other), uniqueIp(), user.accessToken).expect(204)
    expect((await rowsOf(other))[0]!.userId).toBe(user.id)
  })

  it('3 tin / giờ mỗi email (không phân biệt hoa thường), 5 tin / giờ mỗi IP', async () => {
    const email = uniqueEmail()
    for (let i = 0; i < 3; i++) await send(message(email), uniqueIp()).expect(204)
    const byEmail = await send(message(email.toUpperCase()), uniqueIp()).expect(429)
    expect(byEmail.body.error.code).toBe('rate_limited')

    const ip = uniqueIp()
    for (let i = 0; i < 5; i++) await send(message(uniqueEmail()), ip).expect(204)
    await send(message(uniqueEmail()), ip).expect(429)
  })

  it('tên 1 ký tự, email sai, chủ đề lạ, nội dung dưới 10 ký tự → 400', async () => {
    for (const extra of [
      { name: 'L' },
      { email: 'khong-phai-email' },
      { topic: 'spam' },
      { message: 'Ngắn quá' },
    ]) {
      const res = await send(message(uniqueEmail(), extra), uniqueIp()).expect(400)
      expect(res.body.error.code).toBe('validation_failed')
    }
  })
})
