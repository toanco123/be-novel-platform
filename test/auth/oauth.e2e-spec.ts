// Đăng nhập mạng xã hội: Google, Facebook, Apple là bản giả (không gọi provider thật), mọi bước còn
// lại chạy thật (Redis lưu state / mã một lần, Postgres, phiên đăng nhập)
import { randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { AppException } from '@/common/errors/app.exception'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { users } from '@/infra/database/schema'
import type { OAuthProfile, OAuthRedirectClient } from '@/modules/auth/oauth/oauth.types'
import { codeChallengeOf, newCodeVerifier } from '@/modules/auth/oauth/pkce'
import { AppleOAuthClient } from '@/modules/auth/oauth/providers/apple-oauth.client'
import { FacebookOAuthClient } from '@/modules/auth/oauth/providers/facebook-oauth.client'
import { GoogleOAuthClient } from '@/modules/auth/oauth/providers/google-oauth.client'
import { createTestApp } from '../helpers/app'
import { refreshCookieOf, registerUser, uniqueEmail, uniqueIp } from '../helpers/auth'

/** code provider trả về → hồ sơ (test tự đặt) */
const profilesByCode = new Map<string, OAuthProfile>()

const fakeRedirectClient = (provider: 'google' | 'facebook'): OAuthRedirectClient => ({
  provider,
  enabled: true,
  authorizeUrl: ({ state, codeChallenge }) =>
    `https://${provider}.test/auth?state=${state}&code_challenge=${codeChallenge ?? ''}`,
  exchangeCode: async ({ code }) => {
    const profile = profilesByCode.get(code)
    if (!profile) throw new AppException('oauth_failed')
    return profile
  },
})

/** id token giả của Apple: "apple:<sub>:<email>:<nonce>" */
const fakeApple = {
  provider: 'apple',
  enabled: true,
  verifyIdToken: async (idToken: string, nonce: string): Promise<OAuthProfile> => {
    const [, sub, email, expectedNonce] = idToken.split(':')
    if (!sub || nonce !== expectedNonce) throw new AppException('oauth_failed')
    return {
      provider: 'apple',
      providerUserId: sub,
      email: email || null,
      emailVerified: true,
      name: null,
      avatarUrl: null,
    }
  },
}

let app: NestExpressApplication
let db: Db

beforeAll(async () => {
  app = await createTestApp(undefined, [
    { provide: GoogleOAuthClient, useValue: fakeRedirectClient('google') },
    { provide: FacebookOAuthClient, useValue: fakeRedirectClient('facebook') },
    { provide: AppleOAuthClient, useValue: fakeApple },
  ])
  db = app.get(DB)
})
afterAll(() => app.close())

const http = () => request(app.getHttpServer())
const WEB_CALLBACK = 'http://localhost:3000/auth/callback'

const googleProfile = (overrides: Partial<OAuthProfile> = {}): OAuthProfile => ({
  provider: 'google',
  providerUserId: randomUUID(),
  email: uniqueEmail(),
  emailVerified: true,
  name: 'Linh Google',
  avatarUrl: 'https://lh3.googleusercontent.com/a/anh.jpg',
  ...overrides,
})

/** Đi đủ authorize → (provider) → callback; trả URL client nhận được và codeVerifier */
async function redirectFlow(profile: OAuthProfile, redirectTo = WEB_CALLBACK) {
  const verifier = newCodeVerifier()
  const start = await http()
    .get(`/v1/auth/oauth/${profile.provider}/authorize`)
    .query({ redirect_to: redirectTo, code_challenge: codeChallengeOf(verifier) })
    .expect(302)
  const state = new URL(start.headers.location!).searchParams.get('state')!
  const code = `provider-code-${randomUUID()}`
  profilesByCode.set(code, profile)
  const callback = await http()
    .get(`/v1/auth/oauth/${profile.provider}/callback`)
    .query({ code, state, scope: 'email profile' })
    .expect(302)
  return { back: new URL(callback.headers.location!), verifier }
}

const exchange = (code: string, codeVerifier: string, mobile = true) => {
  const req = http().post('/v1/auth/oauth/exchange').send({ code, codeVerifier })
  return mobile ? req.set('X-Client', 'mobile') : req
}

/** Đăng nhập mạng xã hội đủ bước (app), trả phiên */
async function signIn(profile: OAuthProfile) {
  const { back, verifier } = await redirectFlow(profile)
  expect(back.searchParams.get('error')).toBeNull()
  const res = await exchange(back.searchParams.get('code')!, verifier).expect(200)
  return res.body.data as { user: { id: string } & Record<string, unknown>; refreshToken: string }
}

it('danh sách provider đang bật', async () => {
  const res = await http().get('/v1/auth/oauth/providers').expect(200)
  expect(res.body.data.providers).toEqual(['google', 'facebook', 'apple'])
})

describe('luồng chuyển trang', () => {
  it('tài khoản mới: authorize → provider → callback → exchange; tên, ảnh, email đã xác nhận', async () => {
    const profile = googleProfile()
    const { back, verifier } = await redirectFlow(profile)
    expect(`${back.origin}${back.pathname}`).toBe(WEB_CALLBACK)
    const res = await exchange(back.searchParams.get('code')!, verifier).expect(200)
    expect(res.body.data.user).toMatchObject({
      email: profile.email,
      displayName: 'Linh Google',
      avatarUrl: 'https://lh3.googleusercontent.com/a/anh.jpg',
      emailVerified: true,
    })
    await http()
      .post('/v1/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: res.body.data.refreshToken })
      .expect(200)
  })

  it('lần sau cùng người → cùng tài khoản; tên không có thì lấy phần trước @ của email', async () => {
    const profile = googleProfile({
      name: null,
      email: `ten.rieng-${randomUUID().slice(0, 8)}@example.test`,
    })
    const first = await signIn(profile)
    expect(first.user.displayName).toBe(profile.email!.split('@')[0]!.slice(0, 30))
    const again = await signIn({ ...profile, name: 'Tên mới' })
    expect(again.user.id).toBe(first.user.id)
    expect(again.user.displayName).toBe(first.user.displayName)
  })

  it('web: exchange không có X-Client → refresh token trong cookie', async () => {
    const { back, verifier } = await redirectFlow(googleProfile())
    const res = await exchange(back.searchParams.get('code')!, verifier, false).expect(200)
    expect(res.body.data.refreshToken).toBeUndefined()
    expect(refreshCookieOf(res)).toMatch(/HttpOnly/)
  })

  it('app: redirect_to là deep link đã khai báo', async () => {
    const { back } = await redirectFlow(
      { ...googleProfile(), provider: 'facebook' },
      'webtruyen://auth/callback',
    )
    expect(back.protocol).toBe('webtruyen:')
    expect(back.searchParams.get('code')).toBeTruthy()
  })

  it('mã một lần: dùng lại hoặc sai codeVerifier → oauth_failed', async () => {
    const { back, verifier } = await redirectFlow(googleProfile())
    const code = back.searchParams.get('code')!
    await exchange(code, verifier).expect(200)
    expect((await exchange(code, verifier).expect(400)).body.error.code).toBe('oauth_failed')

    const other = await redirectFlow(googleProfile())
    const wrong = await exchange(other.back.searchParams.get('code')!, newCodeVerifier()).expect(
      400,
    )
    expect(wrong.body.error.code).toBe('oauth_failed')
  })

  it('redirect_to lạ → 400 oauth_failed (không chuyển trang)', async () => {
    for (const redirectTo of [
      'https://evil.test/auth/callback',
      'http://localhost:3000.evil.test/x',
      'javascript:alert(1)',
    ]) {
      const res = await http()
        .get('/v1/auth/oauth/google/authorize')
        .query({ redirect_to: redirectTo, code_challenge: codeChallengeOf(newCodeVerifier()) })
        .expect(400)
      expect(res.body.error.code).toBe('oauth_failed')
    }
  })

  it('callback lỗi: state sai → trang báo lỗi của web; người dùng hủy → redirect_to?error', async () => {
    const wrongState = await http()
      .get('/v1/auth/oauth/google/callback')
      .query({ code: 'x', state: 'khong-co' })
      .expect(302)
    expect(wrongState.headers.location).toBe(`${WEB_CALLBACK}?error=oauth_failed`)

    const verifier = newCodeVerifier()
    const start = await http()
      .get('/v1/auth/oauth/google/authorize')
      .query({ redirect_to: WEB_CALLBACK, code_challenge: codeChallengeOf(verifier) })
      .expect(302)
    const state = new URL(start.headers.location!).searchParams.get('state')!
    const cancelled = await http()
      .get('/v1/auth/oauth/google/callback')
      .query({ state, error: 'access_denied' })
      .expect(302)
    expect(new URL(cancelled.headers.location!).searchParams.get('error')).toBe('oauth_failed')
    // state đã dùng
    const reused = await http().get('/v1/auth/oauth/google/callback').query({ state, code: 'x' })
    expect(reused.headers.location).toBe(`${WEB_CALLBACK}?error=oauth_failed`)
  })

  it('không có email → ?error=oauth_email_required; bị khóa → ?error=account_banned', async () => {
    const noEmail = await redirectFlow(googleProfile({ email: null }))
    expect(noEmail.back.searchParams.get('error')).toBe('oauth_email_required')

    const profile = googleProfile()
    const { user } = await signIn(profile)
    await db
      .update(users)
      .set({ bannedUntil: new Date(Date.now() + 86_400_000) })
      .where(eq(users.id, user.id))
    const banned = await redirectFlow(profile)
    expect(banned.back.searchParams.get('error')).toBe('account_banned')
  })
})

describe('liên kết với tài khoản email', () => {
  it('tài khoản đã xác nhận email: liên kết, mật khẩu vẫn dùng được', async () => {
    const local = await registerUser(app)
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, local.id))
    const { user } = await signIn(googleProfile({ email: local.email.toUpperCase() }))
    expect(user.id).toBe(local.id)
    await http()
      .post('/v1/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: local.email, password: local.password })
      .expect(200)
  })

  it('tài khoản chưa xác nhận email: liên kết nhưng bỏ mật khẩu cũ, thu hồi phiên cũ', async () => {
    const local = await registerUser(app)
    const { user } = await signIn(googleProfile({ email: local.email }))
    expect(user.id).toBe(local.id)
    expect(user.emailVerified).toBe(true)
    const login = await http()
      .post('/v1/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: local.email, password: local.password })
      .expect(401)
    expect(login.body.error.code).toBe('invalid_credentials')
    await http()
      .post('/v1/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: local.refreshToken })
      .expect(401)
  })

  it('provider chưa xác minh email mà email đã có tài khoản → ?error=email_taken', async () => {
    const local = await registerUser(app)
    const { back } = await redirectFlow(googleProfile({ email: local.email, emailVerified: false }))
    expect(back.searchParams.get('error')).toBe('email_taken')
  })
})

const appleToken = (sub: string, email: string, nonce: string) => `apple:${sub}:${email}:${nonce}`

describe('Apple (app)', () => {
  it('tài khoản mới dùng displayName app gửi; lần sau không đè tên', async () => {
    const sub = randomUUID()
    const email = `${randomUUID().slice(0, 8)}@privaterelay.appleid.com`
    const first = await http()
      .post('/v1/auth/oauth/apple/token')
      .set('X-Client', 'mobile')
      .send({ idToken: appleToken(sub, email, 'n1'), nonce: 'n1', displayName: '  Linh Apple ' })
      .expect(200)
    expect(first.body.data.user).toMatchObject({ displayName: 'Linh Apple', emailVerified: true })
    expect(first.body.data.refreshToken).toEqual(expect.any(String))

    const again = await http()
      .post('/v1/auth/oauth/apple/token')
      .set('X-Client', 'mobile')
      .send({ idToken: appleToken(sub, email, 'n2'), nonce: 'n2', display_name: 'Tên khác' })
      .expect(200)
    expect(again.body.data.user).toMatchObject({
      id: first.body.data.user.id,
      displayName: 'Linh Apple',
    })
  })

  it('token / nonce sai → oauth_failed', async () => {
    const res = await http()
      .post('/v1/auth/oauth/apple/token')
      .send({ idToken: appleToken(randomUUID(), uniqueEmail(), 'a'), nonce: 'b' })
      .expect(400)
    expect(res.body.error.code).toBe('oauth_failed')
  })
})

describe('provider chưa cấu hình', () => {
  let plain: NestExpressApplication
  beforeAll(async () => {
    plain = await createTestApp()
  })
  afterAll(() => plain.close())
  const api = () => request(plain.getHttpServer())

  it('không có provider nào; authorize, Apple, provider lạ → provider_disabled', async () => {
    expect((await api().get('/v1/auth/oauth/providers').expect(200)).body.data.providers).toEqual(
      [],
    )
    for (const provider of ['google', 'facebook', 'twitter']) {
      const res = await api()
        .get(`/v1/auth/oauth/${provider}/authorize`)
        .query({ redirect_to: WEB_CALLBACK, code_challenge: codeChallengeOf(newCodeVerifier()) })
        .expect(400)
      expect(res.body.error.code).toBe('provider_disabled')
    }
    const apple = await api()
      .post('/v1/auth/oauth/apple/token')
      .send({ idToken: 'x', nonce: 'y' })
      .expect(400)
    expect(apple.body.error.code).toBe('provider_disabled')
  })
})
