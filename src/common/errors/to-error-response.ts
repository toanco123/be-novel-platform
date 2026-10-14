import type { ApiError, ErrorResponse } from './errors.types'

/**
 * Lỗi đã chuẩn hóa (toApiError) → body trả cho client:
 * { statusCode, code, message, details?, requestId }
 */
export function toErrorResponse(
  { status, code, message, details }: ApiError,
  requestId: string,
): ErrorResponse {
  return { statusCode: status, code, message, ...(details ? { details } : {}), requestId }
}
