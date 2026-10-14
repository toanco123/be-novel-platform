import type { ERROR_CODES } from './error-code'

/** Mã lỗi của API (khóa của ERROR_CODES) */
export type ErrorCode = keyof typeof ERROR_CODES

/** Lỗi đã chuẩn hóa, trước khi filter gắn requestId và trả cho client */
export type ApiError = {
  status: number
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}

/** Phần cần dùng của PostgresError (postgres.js) */
export type PgErrorLike = { name: 'PostgresError'; code: string; constraint_name?: string }

/** Lỗi của body-parser (JSON hỏng, body quá lớn) đi qua Express, không phải HttpException */
export type BodyParserError = { type?: unknown; status?: unknown }

/** Body lỗi trả cho client (mọi lỗi cùng một dạng) */
export type ErrorResponse = {
  /** Trùng HTTP status của response */
  statusCode: number
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  requestId: string
}

/** Thông tin thêm khi ghi log lỗi (vd { queue, jobId }); requestId, userId được gắn tự động */
export type ErrorLogContext = Record<string, unknown>

/** Một lỗi validate trong details.issues (client hiện cạnh ô nhập) */
export type ValidationIssue = { path: string; code: string; message: string }
