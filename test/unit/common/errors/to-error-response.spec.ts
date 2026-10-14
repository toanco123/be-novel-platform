import { toErrorResponse } from '@/common/errors/to-error-response'

test('body lỗi: statusCode từ status, gắn requestId, chỉ có details khi có', () => {
  expect(
    toErrorResponse({ status: 404, code: 'not_found', message: 'Resource not found' }, 'req-1'),
  ).toEqual({
    statusCode: 404,
    code: 'not_found',
    message: 'Resource not found',
    requestId: 'req-1',
  })
  expect(
    toErrorResponse(
      { status: 409, code: 'conflict', message: 'Conflict', details: { slug: 'a' } },
      'req-2',
    ),
  ).toEqual({
    statusCode: 409,
    code: 'conflict',
    message: 'Conflict',
    details: { slug: 'a' },
    requestId: 'req-2',
  })
})
