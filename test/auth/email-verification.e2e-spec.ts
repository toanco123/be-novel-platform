// Xác nhận email: thư thật đi qua hàng đợi → worker → Mailpit, rồi bấm link
import type { INestApplicationContext } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { hashToken } from '@/common/crypto/secure-token'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { emailTokens } from '@/infra/database/schema'
import { createWorker } from '@/worker'
import { createTestApp } from '../helpers/app'
import { registerUser } from '../helpers/auth'
import { linkToken, mailCount, waitForMails } from '../helpers/mailpit'

let app: NestExpressApplication
let worker: INestApplicationContext
let db: Db

beforeAll(async () => {
  app = await createTestApp()
  worker = await createWorker()
  await worker.init()
  db = app.get(DB)
})
afterAll(async () => {
  await worker.close()
  await app.close()
})

const http = () => request(app.getHttpServer())
const verify = (token: string) => http().post('/v1/auth/verify-email').send({ token })
const resend = (accessToken: string) =>
  http().post('/v1/auth/resend-verification').set('Authorization', `Bearer ${accessToken}`)

it('đăng ký → thư xác nhận → bấm link → emailVerified, refresh nhận token mới', async () => {
  const user = await registerUser(app, { displayName: 'Linh <b>' })
  const [mail] = await waitForMails(user.email)
  expect(mail!.subject).toBe('Xác nhận email của bạn')
  expect(mail!.text).toContain('http://localhost:3000/auth/verify-email?token=')
  expect(mail!.text).toContain('Chào Linh <b>,')
  // Tên do người dùng nhập được escape trong bản HTML
  expect(mail!.html).toContain('Chào Linh &lt;b&gt;,')

  await verify(linkToken(mail!)).expect(204)
  const me = await http()
    .get('/v1/me')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .expect(200)
  expect(me.body.data.emailVerified).toBe(true)

  const refreshed = await http()
    .post('/v1/auth/refresh')
    .set('X-Client', 'mobile')
    .send({ refreshToken: user.refreshToken })
    .expect(200)
  expect(refreshed.body.data.user.emailVerified).toBe(true)
})

it('link đã dùng, link rác, link hết hạn → 400 invalid_link', async () => {
  const user = await registerUser(app)
  const token = linkToken((await waitForMails(user.email))[0]!)
  await verify(token).expect(204)
  expect((await verify(token).expect(400)).body.error.code).toBe('invalid_link')
  expect((await verify('khong-phai-token').expect(400)).body.error.code).toBe('invalid_link')

  const other = await registerUser(app)
  const expired = linkToken((await waitForMails(other.email))[0]!)
  await db
    .update(emailTokens)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(emailTokens.tokenHash, hashToken(expired)))
  expect((await verify(expired).expect(400)).body.error.code).toBe('invalid_link')
})

it('gửi lại: link cũ hết hiệu lực, link mới dùng được', async () => {
  const user = await registerUser(app)
  const first = linkToken((await waitForMails(user.email))[0]!)
  await resend(user.accessToken).expect(204)
  const [newest] = await waitForMails(user.email, 2)
  const second = linkToken(newest!)
  expect(second).not.toBe(first)
  expect((await verify(first).expect(400)).body.error.code).toBe('invalid_link')
  await verify(second).expect(204)
})

it('đã xác nhận thì gửi lại không gửi thư', async () => {
  const user = await registerUser(app)
  await verify(linkToken((await waitForMails(user.email))[0]!)).expect(204)
  await resend(user.accessToken).expect(204)
  await new Promise((resolve) => setTimeout(resolve, 1500))
  expect(await mailCount(user.email)).toBe(1)
})

it('gửi lại tối đa 3 lần / giờ; cần đăng nhập', async () => {
  const user = await registerUser(app)
  for (let i = 0; i < 3; i++) await resend(user.accessToken).expect(204)
  const res = await resend(user.accessToken).expect(429)
  expect(res.body.error.code).toBe('rate_limited')
  expect((await http().post('/v1/auth/resend-verification').expect(401)).body.error.code).toBe(
    'unauthenticated',
  )
})
