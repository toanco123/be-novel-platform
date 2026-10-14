import { throttleTracker } from '@/common/rate-limit/app-throttler.guard'

test('đã đăng nhập: đếm theo người dùng; khách: theo IP', () => {
  expect(throttleTracker({ user: { id: 'u1' }, ip: '1.2.3.4' })).toBe('user:u1')
  expect(throttleTracker({ ip: '1.2.3.4' })).toBe('ip:1.2.3.4')
  expect(throttleTracker({ ip: undefined })).toBe('ip:unknown')
})
