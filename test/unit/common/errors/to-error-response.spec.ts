import { toErrorResponse } from '@/common/errors/to-error-response'

test('body lỗi: { statusCode, error, meta }, chỉ có details khi có', () => {
  expect(
    toErrorResponse({ status: 404, code: 'not_found', message: 'Resource not found' }, 'req-1'),
  ).toEqual({
    statusCode: 404,
    error: { code: 'not_found', message: 'Resource not found' },
    meta: { requestId: 'req-1' },
  })
  expect(
    toErrorResponse(
      { status: 409, code: 'conflict', message: 'Conflict', details: { slug: 'a' } },
      'req-2',
    ),
  ).toEqual({
    statusCode: 409,
    error: { code: 'conflict', message: 'Conflict', details: { slug: 'a' } },
    meta: { requestId: 'req-2' },
  })
})
