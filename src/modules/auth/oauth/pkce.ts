// PKCE (RFC 7636, S256): client giữ `codeVerifier` bí mật, gửi `codeChallenge` = SHA-256 (base64url)
// của nó; lúc đổi mã phải gửi đúng verifier.
import { createHash, timingSafeEqual } from 'node:crypto'
import { randomToken } from '@/common/crypto/secure-token'

/** code_challenge: 43–128 ký tự base64url */
export const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

export const newCodeVerifier = () => randomToken(32)

export const codeChallengeOf = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url')

/** verifier khớp challenge (so sánh thời gian hằng) */
export function matchesCodeChallenge(verifier: string, challenge: string) {
  const expected = Buffer.from(challenge)
  const actual = Buffer.from(codeChallengeOf(verifier))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
