import { hashRefreshToken, newRefreshToken, refreshTokenState } from '@/modules/auth/refresh-token'
import { REUSE_GRACE_MS } from '@/modules/auth/auth.constants'

describe('refresh token', () => {
  const now = new Date('2026-10-14T10:00:00Z')
  const later = new Date(now.getTime() + 86_400_000)
  const ago = (ms: number) => new Date(now.getTime() - ms)

  it('token ngẫu nhiên 32 byte, hash SHA-256 ổn định', () => {
    const token = newRefreshToken()
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    expect(newRefreshToken()).not.toBe(token)
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token))
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('chưa thu hồi, còn hạn → active; hết hạn → expired', () => {
    const base = { revokedAt: null, replacedById: null }
    expect(refreshTokenState({ ...base, expiresAt: later }, now)).toBe('active')
    expect(refreshTokenState({ ...base, expiresAt: now }, now)).toBe('expired')
  })

  it('thu hồi do đăng xuất (không có token thay) → revoked', () => {
    expect(
      refreshTokenState({ expiresAt: later, revokedAt: ago(1000), replacedById: null }, now),
    ).toBe('revoked')
  })

  it('vừa bị thay trong khoảng ân hạn → grace, quá ân hạn → reused', () => {
    const replaced = { expiresAt: later, replacedById: 'b7c1c5c0-0000-4000-8000-000000000000' }
    expect(refreshTokenState({ ...replaced, revokedAt: ago(2000) }, now)).toBe('grace')
    expect(refreshTokenState({ ...replaced, revokedAt: ago(REUSE_GRACE_MS) }, now)).toBe('grace')
    expect(refreshTokenState({ ...replaced, revokedAt: ago(REUSE_GRACE_MS + 1) }, now)).toBe(
      'reused',
    )
  })

  it('dùng lại token đã thay dù cả họ đã hết hạn vẫn là reused', () => {
    const state = refreshTokenState(
      { expiresAt: ago(1), revokedAt: ago(60_000), replacedById: 'x' },
      now,
    )
    expect(state).toBe('reused')
  })
})
