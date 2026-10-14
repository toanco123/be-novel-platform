// Quên mật khẩu (thư thật qua worker → Mailpit), đặt lại bằng link, đổi mật khẩu
import type { INestApplicationContext } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { createWorker } from '@/worker'
import { createTestApp } from '../helpers/app'
import { registerUser, uniqueEmail, uniqueIp } from '../helpers/auth'
import { linkToken, mailCount, waitForMails } from '../helpers/mailpit'

let app: NestExpressApplication
let worker: INestApplicationContext

beforeAll(async () => {
  app = await createTestApp()
  worker = await createWorker()
  await worker.init()
})
afterAll(async () => {
  await worker.close()
  await app.close()
})

const http = () => request(app.getHttpServer())
const forgot = (email: string, ip = uniqueIp()) =>
  http().post('/v1/auth/forgot-password').set('X-Forwarded-For', ip).send({ email })
const reset = (token: string, password: string) =>
  http().post('/v1/auth/reset-password').send({ token, password })
const login = (email: string, password: string) =>
  http()
    .post('/v1/auth/login')
    .set('X-Forwarded-For', uniqueIp())
    .set('X-Client', 'mobile')
    .send({ email, password })
const refresh = (refreshToken: string) =>
  http().post('/v1/auth/refresh').set('X-Client', 'mobile').send({ refreshToken })
const changePassword = (accessToken: string, currentPassword: string, newPassword: string) =>
  http()
    .post('/v1/auth/change-password')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ currentPassword, newPassword })

/** Thư đặt lại mật khẩu mới nhất (bỏ qua thư xác nhận email lúc đăng ký) */
async function resetMail(email: string, count: number) {
  const mails = await waitForMails(email, count)
  return mails.find((mail) => mail.subject === 'Đặt lại mật khẩu')!
}

describe('quên và đặt lại mật khẩu', () => {
  it('email không có tài khoản: vẫn 204, không gửi thư', async () => {
    const email = uniqueEmail()
    await forgot(email).expect(204)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(await mailCount(email)).toBe(0)
  })

  it('đặt lại: mật khẩu mới dùng được, mật khẩu cũ và mọi phiên cũ hết hiệu lực', async () => {
    const user = await registerUser(app)
    await forgot(user.email.toUpperCase()).expect(204)
    const mail = await resetMail(user.email, 2)
    expect(mail.text).toContain('http://localhost:3000/auth/reset-password?token=')
    const token = linkToken(mail)

    await reset(token, 'matkhaumoi456').expect(204)
    expect((await reset(token, 'matkhaukhac789').expect(400)).body.error.code).toBe('invalid_link')
    expect((await login(user.email, user.password).expect(401)).body.error.code).toBe(
      'invalid_credentials',
    )
    expect((await refresh(user.refreshToken).expect(401)).body.error.code).toBe('invalid_token')
    const res = await login(user.email, 'matkhaumoi456').expect(200)
    // Đặt lại bằng link = đã chứng minh có hộp thư
    expect(res.body.data.user.emailVerified).toBe(true)
  })

  it('mật khẩu mới yếu → validation_failed (thiếu số / thiếu chữ)', async () => {
    const user = await registerUser(app)
    await forgot(user.email).expect(204)
    const token = linkToken(await resetMail(user.email, 2))
    const noDigit = await reset(token, 'chikhongcoso').expect(400)
    expect(noDigit.body.error.details.issues).toEqual([
      expect.objectContaining({ path: 'password', code: 'hasDigit' }),
    ])
    const noLetter = await reset(token, '1234567890').expect(400)
    expect(noLetter.body.error.details.issues).toEqual([
      expect.objectContaining({ path: 'password', code: 'hasLetter' }),
    ])
    // Link chưa bị dùng vì body sai
    await reset(token, 'matkhaumoi456').expect(204)
  })

  it('quên mật khẩu tối đa 3 lần / giờ / email', async () => {
    const email = uniqueEmail()
    for (let i = 0; i < 3; i++) await forgot(email).expect(204)
    expect((await forgot(email).expect(429)).body.error.code).toBe('rate_limited')
  })
})

describe('đổi mật khẩu', () => {
  it('sai mật khẩu cũ → invalid_credentials; trùng mật khẩu cũ → same_password; yếu → validation_failed', async () => {
    const user = await registerUser(app)
    const wrong = await changePassword(user.accessToken, 'sai-mat-khau-1', 'matkhaumoi456')
    expect(wrong.status).toBe(401)
    expect(wrong.body.error.code).toBe('invalid_credentials')
    const same = await changePassword(user.accessToken, user.password, user.password)
    expect(same.status).toBe(400)
    expect(same.body.error.code).toBe('same_password')
    const weak = await changePassword(user.accessToken, user.password, 'ngan')
    expect(weak.body.error.code).toBe('validation_failed')
  })

  it('đổi xong: thiết bị khác bị đăng xuất, thiết bị đang dùng giữ phiên', async () => {
    const user = await registerUser(app)
    const other = await login(user.email, user.password).expect(200)
    await changePassword(user.accessToken, user.password, 'matkhaumoi456').expect(204)

    expect((await refresh(other.body.data.refreshToken).expect(401)).body.error.code).toBe(
      'invalid_token',
    )
    await refresh(user.refreshToken).expect(200)
    await login(user.email, 'matkhaumoi456').expect(200)
    await login(user.email, user.password).expect(401)
  })

  it('sai mật khẩu cũ 5 lần → rate_limited; cần đăng nhập', async () => {
    const user = await registerUser(app)
    for (let i = 0; i < 5; i++) {
      await changePassword(user.accessToken, 'sai-mat-khau-1', 'matkhaumoi456').expect(401)
    }
    const blocked = await changePassword(user.accessToken, user.password, 'matkhaumoi456')
    expect(blocked.status).toBe(429)
    await http().post('/v1/auth/change-password').expect(401)
  })
})
