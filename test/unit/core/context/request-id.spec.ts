import { resolveRequestId } from '@/core/context/request-id'

test('dùng lại x-request-id hợp lệ của client', () => {
  expect(resolveRequestId('abc-123')).toBe('abc-123')
  expect(resolveRequestId(['first-id', 'second'])).toBe('first-id')
})

test('giá trị lạ hoặc quá dài thì tự sinh id mới', () => {
  const uuid = /^[0-9a-f-]{36}$/
  expect(resolveRequestId(undefined)).toMatch(uuid)
  expect(resolveRequestId('có dấu cách')).toMatch(uuid)
  expect(resolveRequestId('x'.repeat(65))).toMatch(uuid)
  expect(resolveRequestId('<script>')).toMatch(uuid)
})
