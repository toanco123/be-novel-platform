import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common'
import { AppException } from '@/common/errors/app.exception'
import { toApiError } from '@/common/errors/to-api-error'

test('AppException giữ đúng mã, status và details', () => {
  expect(toApiError(new AppException('conflict', { slug: 'ngon-tinh' }))).toEqual({
    status: 409,
    code: 'conflict',
    message: 'Conflict with the current state',
    details: { slug: 'ngon-tinh' },
  })
})

test('HttpException theo status', () => {
  expect(toApiError(new NotFoundException()).code).toBe('not_found')
  expect(toApiError(new BadRequestException()).code).toBe('bad_request')
  expect(toApiError(new PayloadTooLargeException()).code).toBe('payload_too_large')
})

test('lỗi của body-parser: JSON hỏng, body quá lớn', () => {
  expect(toApiError({ type: 'entity.parse.failed', status: 400 }).code).toBe('bad_request')
  expect(toApiError({ type: 'entity.too.large', status: 413 }).code).toBe('payload_too_large')
})

test('lỗi lạ thành internal_error, không lộ thông điệp gốc', () => {
  const error = toApiError(new Error('mật khẩu DB là ...'))
  expect(error).toEqual({ status: 500, code: 'internal_error', message: 'Internal server error' })
})
