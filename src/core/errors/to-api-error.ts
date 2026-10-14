// Đổi mọi loại lỗi về một dạng trả cho client: { status, code, message, details? }.
// Hàm thuần (không phụ thuộc Nest DI) để test riêng.
import { HttpException } from '@nestjs/common'
import { AppError } from './app-error'
import { ERROR_CODES, type ErrorCode } from './error-codes'
import { pgErrorCode } from './pg-error'

export type ApiError = {
  status: number
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}

const fromCode = (code: ErrorCode, details?: Record<string, unknown>): ApiError => ({
  status: ERROR_CODES[code].status,
  code,
  message: ERROR_CODES[code].message,
  ...(details ? { details } : {}),
})

/** Mã lỗi theo HTTP status của HttpException (lỗi của Nest hoặc thư viện) */
function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'bad_request'
    case 401:
      return 'unauthenticated'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 413:
      return 'payload_too_large'
    case 429:
      return 'rate_limited'
    case 503:
      return 'service_unavailable'
    default:
      return status >= 500 ? 'internal_error' : 'bad_request'
  }
}

/** Lỗi của body-parser (JSON hỏng, body quá lớn) đi qua Express, không phải HttpException */
type BodyParserError = { type?: unknown; status?: unknown }

export function toApiError(exception: unknown): ApiError {
  if (exception instanceof AppError) return fromCode(exception.code, exception.details)
  if (exception instanceof HttpException) return fromCode(codeForStatus(exception.getStatus()))

  // Lỗi Postgres (Drizzle bọc trong cause): trùng khóa, khóa ngoại, check, quá thời gian
  const pgCode = pgErrorCode(exception)
  if (pgCode) return fromCode(pgCode)

  const parser = exception as BodyParserError | null
  if (parser && typeof parser === 'object') {
    if (parser.type === 'entity.too.large') return fromCode('payload_too_large')
    if (parser.type === 'entity.parse.failed') return fromCode('bad_request')
  }
  return fromCode('internal_error')
}
