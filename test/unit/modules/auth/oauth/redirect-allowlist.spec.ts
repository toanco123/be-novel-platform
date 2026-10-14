import { isAllowedRedirect } from '@/modules/auth/oauth/redirect-allowlist'

const allowed = ['http://localhost:3000', 'https://web.example.com/app', 'webtruyen://']

describe('isAllowedRedirect', () => {
  it.each([
    'http://localhost:3000/auth/callback',
    'http://localhost:3000/auth/callback?next=%2Fstory%2Fa',
    'https://web.example.com/app',
    'https://web.example.com/app/auth/callback',
    'webtruyen://auth/callback',
    'webtruyen://callback?x=1',
  ])('cho phép %s', (target) => {
    expect(isAllowedRedirect(target, allowed)).toBe(true)
  })

  it.each([
    'http://localhost:3001/auth/callback',
    'https://localhost:3000/auth/callback',
    'http://localhost:3000.evil.com/auth',
    'http://localhost:3000@evil.com/auth',
    'https://evil.com/?r=http://localhost:3000',
    'https://web.example.com/application',
    'https://web.example.com/',
    'otherapp://auth/callback',
    'javascript:alert(1)',
    'khong-phai-url',
    '',
  ])('chặn %s', (target) => {
    expect(isAllowedRedirect(target, allowed)).toBe(false)
  })
})
