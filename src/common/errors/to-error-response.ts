import type { ApiError, ErrorResponse } from './errors.types'

/** Lỗi đã chuẩn hóa (toApiError) → body trả cho client: { code, message, details?, requestId } */
export function toErrorResponse(
  { code, message, details }: ApiError,
  requestId: string,
): ErrorResponse {
  return { code, message, ...(details ? { details } : {}), requestId }
}
