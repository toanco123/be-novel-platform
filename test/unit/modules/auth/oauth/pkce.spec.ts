import {
  CODE_CHALLENGE_PATTERN,
  codeChallengeOf,
  matchesCodeChallenge,
  newCodeVerifier,
} from '@/modules/auth/oauth/pkce'

describe('PKCE', () => {
  it('challenge đúng chuẩn RFC 7636 (ví dụ trong RFC)', () => {
    expect(codeChallengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })

  it('verifier mới hợp lệ, khớp challenge của nó, không khớp challenge khác', () => {
    const verifier = newCodeVerifier()
    expect(verifier).toMatch(CODE_CHALLENGE_PATTERN)
    expect(matchesCodeChallenge(verifier, codeChallengeOf(verifier))).toBe(true)
    expect(matchesCodeChallenge(newCodeVerifier(), codeChallengeOf(verifier))).toBe(false)
    expect(matchesCodeChallenge(verifier, 'ngan')).toBe(false)
  })
})
