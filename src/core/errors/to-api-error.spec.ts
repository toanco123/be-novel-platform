import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common'
import { ZodValidationException } from 'nestjs-zod'
import { z } from 'zod'
import { AppError } from './app-error'
import { toApiError } from './to-api-error'

test('AppError giữ đúng mã, status và details', () => {
  expect(toApiError(new AppError('conflict', { slug: 'ngon-tinh' }))).toEqual({
    status: 409,
    code: 'conflict',
    message: 'Conflict with the current state',
    details: { slug: 'ngon-tinh' },
  })
})

test('lỗi zod thành validation_failed kèm danh sách issue theo đường dẫn', () => {
  const result = z.object({ name: z.string().min(2), age: z.number() }).safeParse({ name: 'a' })
  const error = toApiError(new ZodValidationException(result.error!))
  expect(error).toMatchObject({ status: 400, code: 'validation_failed' })
  expect(error.details?.issues).toEqual([
    expect.objectContaining({ path: 'name', code: 'too_small' }),
    expect.objectContaining({ path: 'age', code: 'invalid_type' }),
  ])
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
