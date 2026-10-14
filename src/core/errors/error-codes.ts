// Mã lỗi của API: client đọc `code` để hiện lời tiếng Việt (web đang làm vậy với mã lỗi của
// Supabase), `message` tiếng Anh chỉ để dev đọc. Thêm mã mới thì thêm vào đây.
export const ERROR_CODES = {
  bad_request: { status: 400, message: 'Bad request' },
  validation_failed: { status: 400, message: 'Request validation failed' },
  unauthenticated: { status: 401, message: 'Authentication required' },
  invalid_token: { status: 401, message: 'Token is invalid or expired' },
  invalid_credentials: { status: 401, message: 'Email or password is incorrect' },
  token_reused: { status: 401, message: 'Refresh token was already used' },
  account_banned: { status: 403, message: 'This account is banned' },
  email_taken: { status: 409, message: 'Email is already registered' },
  forbidden: { status: 403, message: 'You are not allowed to do this' },
  not_found: { status: 404, message: 'Resource not found' },
  conflict: { status: 409, message: 'Conflict with the current state' },
  payload_too_large: { status: 413, message: 'Request body is too large' },
  rate_limited: { status: 429, message: 'Too many requests, try again later' },
  internal_error: { status: 500, message: 'Internal server error' },
  timeout: { status: 503, message: 'The request took too long' },
  service_unavailable: { status: 503, message: 'A dependency is not available' },
} as const satisfies Record<string, { status: number; message: string }>

export type ErrorCode = keyof typeof ERROR_CODES

export const isErrorCode = (code: string): code is ErrorCode => Object.hasOwn(ERROR_CODES, code)
