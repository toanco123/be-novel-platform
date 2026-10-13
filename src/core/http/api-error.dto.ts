import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ERROR_CODES, type ErrorCode } from '../errors/error-codes'

/** Dạng lỗi chung của API (hiện trong Swagger) */
export const apiErrorSchema = z.object({
  code: z.enum(Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string(),
})

export class ApiErrorDto extends createZodDto(apiErrorSchema) {}
