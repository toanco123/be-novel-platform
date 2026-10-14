import { toBlockedUser } from '@/modules/blocks/blocks.mapper'

describe('toBlockedUser', () => {
  it('người bị chặn → giống BlockedUser của web', () => {
    expect(
      toBlockedUser({
        id: 'u1',
        displayName: 'Kẻ phá',
        avatarUrl: 'https://cdn.test/a.webp',
        blockedAt: new Date('2026-10-14T00:00:00Z'),
      }),
    ).toEqual({
      user: { id: 'u1', displayName: 'Kẻ phá', avatarUrl: 'https://cdn.test/a.webp' },
      blockedAt: '2026-10-14T00:00:00.000Z',
    })
  })
})
