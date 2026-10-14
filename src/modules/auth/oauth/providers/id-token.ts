// Xác minh id token (JWT) của Google, Apple bằng khóa công khai của provider (JWKS).
import { createHash } from 'node:crypto'
import { errors, type JWTVerifyGetKey, jwtVerify } from 'jose'
import { AppException } from '@/common/errors/app.exception'
import type { IdTokenCheck, IdTokenClaims } from '../oauth.types'

/** SHA-256 (hex) của nonce gốc: app Apple ký bản băm này vào id token */
export const nonceHash = (nonce: string) => createHash('sha256').update(nonce).digest('hex')

/** Sai chữ ký, hết hạn, sai iss / aud / nonce → 400 oauth_failed */
export async function verifyIdToken(
  token: string,
  jwks: JWTVerifyGetKey,
  { issuer, audience, nonceHash: expectedNonce }: IdTokenCheck,
): Promise<IdTokenClaims> {
  let claims: IdTokenClaims
  try {
    const { payload } = await jwtVerify<IdTokenClaims>(token, jwks, {
      issuer,
      audience,
      algorithms: ['RS256', 'ES256'],
    })
    claims = payload
  } catch (error) {
    if (error instanceof errors.JOSEError) throw new AppException('oauth_failed')
    throw error
  }
  if (typeof claims.sub !== 'string' || !claims.sub) throw new AppException('oauth_failed')
  if (expectedNonce !== undefined && claims.nonce !== expectedNonce) {
    throw new AppException('oauth_failed')
  }
  return claims
}

/** email_verified có provider trả boolean, có provider (Apple) trả chuỗi "true" */
export const isEmailVerified = (claims: IdTokenClaims) =>
  claims.email_verified === true || claims.email_verified === 'true'
