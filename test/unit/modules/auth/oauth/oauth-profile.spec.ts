import { oauthAvatarUrl, oauthDisplayName } from '@/modules/auth/oauth/oauth-profile'

describe('oauthDisplayName (giống handle_new_user của Supabase)', () => {
  it('ưu tiên tên provider, bỏ khoảng trắng, tối đa 30 ký tự', () => {
    expect(oauthDisplayName({ name: '  Linh Nguyễn ', email: 'a@b.co' })).toBe('Linh Nguyễn')
    expect(oauthDisplayName({ name: 'x'.repeat(40), email: null })).toHaveLength(30)
  })

  it('không có tên → phần trước @ của email → "Bạn đọc"', () => {
    expect(oauthDisplayName({ name: '   ', email: 'linh.nguyen@gmail.com' })).toBe('linh.nguyen')
    expect(oauthDisplayName({ name: null, email: null })).toBe('Bạn đọc')
    expect(oauthDisplayName({ name: null, email: '@gmail.com' })).toBe('Bạn đọc')
  })
})

describe('oauthAvatarUrl', () => {
  it('chỉ nhận https, tối đa 2048 ký tự', () => {
    expect(oauthAvatarUrl({ avatarUrl: 'https://cdn.example.com/a.jpg' })).toBe(
      'https://cdn.example.com/a.jpg',
    )
    expect(oauthAvatarUrl({ avatarUrl: 'http://cdn.example.com/a.jpg' })).toBeNull()
    expect(oauthAvatarUrl({ avatarUrl: `https://x.com/${'a'.repeat(2048)}` })).toBeNull()
    expect(oauthAvatarUrl({ avatarUrl: null })).toBeNull()
  })
})
