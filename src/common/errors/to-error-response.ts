import type { ApiError, ErrorResponse } from './errors.types'

/**
 * Lỗi đã chuẩn hóa (toApiError) → body trả cho client:
 * { statusCode, error: { code, message, details? }, meta: { requestId } }
 */
export function toErrorResponse(
  { status, code, message, details }: ApiError,
  requestId: string,
): ErrorResponse {
  return {
    statusCode: status,
    error: { code, message, ...(details ? { details } : {}) },
    meta: { requestId },
  }
}
