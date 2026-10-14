// Xóa tài khoản: DELETE /v1/me (có mật khẩu thì nhập mật khẩu, không có thì gõ lại email)
import { randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { TokenService } from '@/common/auth/token.service'
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
const deleteMe = (accessToken: string, body: object) =>
  http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send(body)

it('sai hoặc thiếu mật khẩu → 401 invalid_credentials, tài khoản còn nguyên', async () => {
  const user = await registerUser(app)
  expect((await deleteMe(user.accessToken, { password: 'sai-mat-khau-1' })).body.error.code).toBe(
    'invalid_credentials',
  )
  expect((await deleteMe(user.accessToken, {})).status).toBe(401)
  await http().get('/v1/me').set('Authorization', `Bearer ${user.accessToken}`).expect(200)
})

it('đúng mật khẩu: xóa hẳn, xóa cookie, đăng nhập và refresh không được nữa', async () => {
  const user = await registerUser(app)
  const res = await deleteMe(user.accessToken, { password: user.password }).expect(204)
  expect(refreshCookieOf(res)).toMatch(/refresh_token=;.*Expires=Thu, 01 Jan 1970/)

  const [row] = await db.select().from(users).where(eq(users.id, user.id))
  expect(row).toBeUndefined()
  const login = await http()
    .post('/v1/auth/login')
    .set('X-Forwarded-For', uniqueIp())
    .send({ email: user.email, password: user.password })
    .expect(401)
  expect(login.body.error.code).toBe('invalid_credentials')
  await http()
    .post('/v1/auth/refresh')
    .set('X-Client', 'mobile')
    .send({ refreshToken: user.refreshToken })
    .expect(401)
  // Access token còn hạn nhưng tài khoản không còn
  await http().get('/v1/me').set('Authorization', `Bearer ${user.accessToken}`).expect(404)
})

it('tài khoản không có mật khẩu (Google / Facebook): phải gõ lại đúng email', async () => {
  const email = uniqueEmail()
  const [user] = await db.insert(users).values({ email, passwordHash: null }).returning()
  await db.insert(profiles).values({ id: user!.id, displayName: 'Chỉ Google' })
  const accessToken = await app
    .get(TokenService)
    .signAccessToken({ id: user!.id, role: 'user', sessionId: randomUUID(), emailVerified: true })

  const wrong = await deleteMe(accessToken, { confirmEmail: uniqueEmail() }).expect(400)
  expect(wrong.body.error).toMatchObject({
    code: 'validation_failed',
    details: { issues: [expect.objectContaining({ path: 'confirmEmail' })] },
  })
  await deleteMe(accessToken, { confirmEmail: `  ${email.toUpperCase()} ` }).expect(204)
  const [row] = await db.select().from(users).where(eq(users.id, user!.id))
  expect(row).toBeUndefined()
})

it('cần đăng nhập', async () => {
  expect((await http().delete('/v1/me').expect(401)).body.error.code).toBe('unauthenticated')
})
