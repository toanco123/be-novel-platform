// Lỗi Postgres → mã lỗi của API. Drizzle bọc lỗi của postgres.js trong `cause` (DrizzleQueryError),
// nên phải tìm theo chuỗi cause. Lỗi không phải của Postgres trả null để xử lý tiếp.
import type { ErrorCode } from './error-codes'

/** Phần cần dùng của PostgresError (postgres.js) */
type PgErrorLike = { name: 'PostgresError'; code: string; constraint_name?: string }

/**
 * Tên constraint unique → mã lỗi riêng (vd `genres_pkey` → `genre_exists`). Module thêm vào đây khi
 * cần báo trùng rõ ràng hơn `conflict`
 */
export const CONSTRAINT_CODES: Record<string, ErrorCode> = {
  users_email_unique: 'email_taken',
}

const BY_SQLSTATE: Record<string, ErrorCode> = {
  '23505': 'conflict', // unique_violation
  '23503': 'not_found', // foreign_key_violation: bản ghi được tham chiếu không còn
  '23514': 'validation_failed', // check_violation
  '22001': 'validation_failed', // string_data_right_truncation
  '57014': 'timeout', // query_canceled (statement_timeout)
}

const isPgError = (value: unknown): value is PgErrorLike =>
  typeof value === 'object' &&
  value !== null &&
  (value as { name?: unknown }).name === 'PostgresError' &&
  typeof (value as { code?: unknown }).code === 'string'

/** Lỗi Postgres trong chuỗi cause (tối đa 5 lớp), hoặc null */
export function findPgError(error: unknown): PgErrorLike | null {
  let current = error
  for (let depth = 0; depth < 5 && current; depth++) {
    if (isPgError(current)) return current
    current = (current as { cause?: unknown }).cause
  }
  return null
}

/** Mã lỗi API cho lỗi Postgres đã biết; lỗi khác (kể cả Postgres lạ) trả null → internal_error */
export function pgErrorCode(error: unknown): ErrorCode | null {
  const pg = findPgError(error)
  if (!pg) return null
  if (pg.code === '23505' && pg.constraint_name) {
    return CONSTRAINT_CODES[pg.constraint_name] ?? 'conflict'
  }
  return BY_SQLSTATE[pg.code] ?? null
}
