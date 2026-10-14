import { createHmac } from 'node:crypto'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import type { AppConfig } from '@/config/app-config.service'
import { FacebookOAuthClient } from '@/modules/auth/oauth/providers/facebook-oauth.client'
import { GoogleOAuthClient } from '@/modules/auth/oauth/providers/google-oauth.client'

const config = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as AppConfig

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const requestedUrl = (call: number) => String(fetchMock.mock.calls[call]![0])

describe('GoogleOAuthClient', () => {
  const google = new GoogleOAuthClient(
    config({ GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsecret' }),
  )

  it('bật khi có client id và secret', () => {
    expect(google.enabled).toBe(true)
    expect(new GoogleOAuthClient(config({ GOOGLE_CLIENT_ID: 'gid' })).enabled).toBe(false)
  })

  it('URL đăng nhập có state, redirect_uri, PKCE S256', () => {
    const url = new URL(
      google.authorizeUrl({ state: 's1', redirectUri: 'https://api.test/cb', codeChallenge: 'c1' }),
    )
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'gid',
      redirect_uri: 'https://api.test/cb',
      response_type: 'code',
      scope: 'openid email profile',
      state: 's1',
      code_challenge: 'c1',
      code_challenge_method: 'S256',
    })
  })

  it('đổi code (kèm code_verifier) lấy id token, xác minh bằng JWKS của Google → hồ sơ', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const idToken = await new SignJWT({
      email: 'linh@gmail.com',
      email_verified: true,
      name: 'Linh',
      picture: 'https://lh3.googleusercontent.com/a.jpg',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'g1' })
      .setSubject('google-sub')
      .setIssuer('https://accounts.google.com')
      .setAudience('gid')
      .setExpirationTime('5m')
      .sign(privateKey)
    const jwk = { ...(await exportJWK(publicKey)), kid: 'g1', alg: 'RS256', use: 'sig' }
    fetchMock.mockImplementation(async (input) =>
      String(input).startsWith('https://oauth2.googleapis.com/token')
        ? Response.json({ id_token: idToken })
        : Response.json({ keys: [jwk] }),
    )

    const profile = await google.exchangeCode({
      code: 'c',
      redirectUri: 'https://api.test/cb',
      codeVerifier: 'v',
    })
    expect(profile).toEqual({
      provider: 'google',
      providerUserId: 'google-sub',
      email: 'linh@gmail.com',
      emailVerified: true,
      name: 'Linh',
      avatarUrl: 'https://lh3.googleusercontent.com/a.jpg',
    })
    const tokenBody = Object.fromEntries(fetchMock.mock.calls[0]![1]!.body as URLSearchParams)
    expect(tokenBody).toMatchObject({
      code: 'c',
      client_id: 'gid',
      client_secret: 'gsecret',
      grant_type: 'authorization_code',
      code_verifier: 'v',
    })
  })

  it('Google báo lỗi khi đổi code → oauth_failed', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'invalid_grant' }, { status: 400 }))
    await expect(
      google.exchangeCode({ code: 'c', redirectUri: 'https://api.test/cb' }),
    ).rejects.toMatchObject({ code: 'oauth_failed' })
  })
})

describe('FacebookOAuthClient', () => {
  const facebook = new FacebookOAuthClient(
    config({ FACEBOOK_APP_ID: 'fid', FACEBOOK_APP_SECRET: 'fsecret' }),
  )

  it('đổi code lấy access token, đọc hồ sơ kèm appsecret_proof', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ access_token: 'fb-token' }))
      .mockResolvedValueOnce(
        Response.json({
          id: 'fb-1',
          name: 'Linh FB',
          email: 'linh@fb.test',
          picture: { data: { url: 'https://graph.fb.test/p.jpg', is_silhouette: false } },
        }),
      )
    const profile = await facebook.exchangeCode({ code: 'c', redirectUri: 'https://api.test/cb' })
    expect(profile).toEqual({
      provider: 'facebook',
      providerUserId: 'fb-1',
      email: 'linh@fb.test',
      emailVerified: true,
      name: 'Linh FB',
      avatarUrl: 'https://graph.fb.test/p.jpg',
    })
    expect(requestedUrl(0)).toContain('/oauth/access_token?')
    const me = new URL(requestedUrl(1))
    expect(me.searchParams.get('appsecret_proof')).toBe(
      createHmac('sha256', 'fsecret').update('fb-token').digest('hex'),
    )
  })

  it('không có email (đăng ký bằng số điện thoại), ảnh mặc định → email null, không lấy ảnh', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ access_token: 't' })).mockResolvedValueOnce(
      Response.json({
        id: 'fb-2',
        picture: { data: { url: 'https://x/p.jpg', is_silhouette: true } },
      }),
    )
    const profile = await facebook.exchangeCode({ code: 'c', redirectUri: 'https://api.test/cb' })
    expect(profile).toMatchObject({ email: null, emailVerified: false, avatarUrl: null })
  })
})
