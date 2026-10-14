import type { Actor } from '@/common/auth/auth.types'
import { viewerKey, viewSeenKey } from '@/modules/chapters/chapter-view-keys'

const actor: Actor = { id: 'user-1', role: 'user', sessionId: 's', emailVerified: false }

describe('viewerKey', () => {
  it('người đăng nhập tính theo id, kể cả khi có IP', () => {
    expect(viewerKey(actor, 'abc123')).toBe('u:user-1')
  })

  it('khách tính theo IP đã băm', () => {
    expect(viewerKey(undefined, 'abc123')).toBe('ip:abc123')
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
