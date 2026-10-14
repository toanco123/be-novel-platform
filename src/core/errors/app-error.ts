import { ERROR_CODES } from './error-codes'
import type { ErrorCode } from './errors.types'

/**
 * Lỗi nghiệp vụ service ném ra: `throw new AppError('not_found')`. `details` (tùy chọn) gửi kèm
 * cho client, vd thể loại trùng tên đang có
 */
export class AppError extends Error {
  readonly status: number

  constructor(
    readonly code: ErrorCode,
    readonly details?: Record<string, unknown>,
    message?: string,
  ) {
    super(message ?? ERROR_CODES[code].message)
    this.name = 'AppError'
    this.status = ERROR_CODES[code].status
  }
}
