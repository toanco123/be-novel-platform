import { createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey, SignJWT } from 'jose'
import { isEmailVerified, nonceHash, verifyIdToken } from '@/modules/auth/oauth/providers/id-token'

let jwks: JWTVerifyGetKey
let sign: (claims: Record<string, unknown>, options?: { exp?: string }) => Promise<string>

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] })
  sign = (claims, options = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://appleid.apple.com')
      .setAudience('vn.webtruyen.app')
      .setIssuedAt()
      .setExpirationTime(options.exp ?? '5m')
      .sign(privateKey)
})

const check = { issuer: 'https://appleid.apple.com', audience: ['vn.webtruyen.app'] }
const failed = { code: 'oauth_failed' }

describe('verifyIdToken', () => {
  it('đúng chữ ký, iss, aud, nonce → claims', async () => {
    const token = await sign({ sub: 'u1', email: 'a@b.co', nonce: nonceHash('n') })
    const claims = await verifyIdToken(token, jwks, { ...check, nonceHash: nonceHash('n') })
    expect(claims).toMatchObject({ sub: 'u1', email: 'a@b.co' })
  })

  it('sai aud, sai iss, hết hạn, sai nonce, thiếu sub, chuỗi rác → oauth_failed', async () => {
    const token = await sign({ sub: 'u1', nonce: nonceHash('n') })
    await expect(verifyIdToken(token, jwks, { ...check, audience: 'khac' })).rejects.toMatchObject(
      failed,
    )
    await expect(
      verifyIdToken(token, jwks, { ...check, issuer: 'https://khac' }),
    ).rejects.toMatchObject(failed)
    await expect(
      verifyIdToken(token, jwks, { ...check, nonceHash: nonceHash('khac') }),
    ).rejects.toMatchObject(failed)
    const expired = await sign({ sub: 'u1' }, { exp: '-1m' })
    await expect(verifyIdToken(expired, jwks, check)).rejects.toMatchObject(failed)
    const noSub = await sign({ email: 'a@b.co' })
    await expect(verifyIdToken(noSub, jwks, check)).rejects.toMatchObject(failed)
    await expect(verifyIdToken('rac', jwks, check)).rejects.toMatchObject(failed)
  })

  it('email_verified: boolean hoặc chuỗi "true" (Apple)', () => {
    expect(isEmailVerified({ sub: 'u', email_verified: true })).toBe(true)
    expect(isEmailVerified({ sub: 'u', email_verified: 'true' })).toBe(true)
    expect(isEmailVerified({ sub: 'u', email_verified: 'false' })).toBe(false)
    expect(isEmailVerified({ sub: 'u' })).toBe(false)
  })
})
