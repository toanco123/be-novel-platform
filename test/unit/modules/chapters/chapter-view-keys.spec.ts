import type { Actor } from '@/common/auth/auth.types'
import { hashToken } from '@/common/crypto/secure-token'
import { viewerKey, viewSeenKey } from '@/modules/chapters/chapter-view-keys'

const actor: Actor = { id: 'user-1', role: 'user', sessionId: 's', emailVerified: false }

describe('viewerKey', () => {
  it('người đăng nhập tính theo id, kể cả khi có IP', () => {
    expect(viewerKey(actor, '10.0.0.1')).toBe('u:user-1')
  })

  it('khách tính theo IP đã băm (không giữ IP gốc)', () => {
    const key = viewerKey(undefined, '10.0.0.1')
    expect(key).toBe(`ip:${hashToken('10.0.0.1')}`)
    expect(key).not.toContain('10.0.0.1')
  })

  it('khách không có IP dùng chung một khóa', () => {
    expect(viewerKey(undefined, null)).toBe('unknown')
  })
})

describe('viewSeenKey', () => {
  it('theo ngày, truyện, chương, người xem', () => {
    expect(viewSeenKey('2026-10-14', 'story-1', 3, 'u:user-1')).toBe(
      'views:seen:2026-10-14:story-1:3:u:user-1',
    )
  })
})
