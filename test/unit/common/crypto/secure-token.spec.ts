import { hashToken, randomToken } from '@/common/crypto/secure-token'

describe('secure token', () => {
  it('token ngẫu nhiên 32 byte, hash SHA-256 ổn định', () => {
    const token = randomToken()
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    expect(randomToken()).not.toBe(token)
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('độ dài tùy chọn', () => {
    expect(Buffer.from(randomToken(16), 'base64url')).toHaveLength(16)
  })
})
