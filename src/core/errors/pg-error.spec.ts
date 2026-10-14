import { CONSTRAINT_CODES, findPgError, pgErrorCode } from './pg-error'
import { toApiError } from './to-api-error'

const pg = (code: string, constraint_name?: string) =>
  Object.assign(new Error('pg'), { name: 'PostgresError', code, constraint_name })
/** Như DrizzleQueryError: lỗi gốc nằm trong cause */
const wrapped = (cause: unknown) => Object.assign(new Error('Failed query'), { cause })

test('tìm được lỗi Postgres bọc nhiều lớp trong cause', () => {
  const inner = pg('23505')
  expect(findPgError(wrapped(wrapped(inner)))).toBe(inner)
  expect(findPgError(new Error('khác'))).toBeNull()
  expect(findPgError(null)).toBeNull()
})

test('đổi mã SQLSTATE sang mã API', () => {
  expect(pgErrorCode(wrapped(pg('23505', 'items_name_key')))).toBe('conflict')
  expect(pgErrorCode(wrapped(pg('23503')))).toBe('not_found')
  expect(pgErrorCode(wrapped(pg('23514')))).toBe('validation_failed')
  expect(pgErrorCode(wrapped(pg('57014')))).toBe('timeout')
  // Lỗi Postgres lạ (vd cú pháp SQL) là lỗi của code: để thành internal_error
  expect(pgErrorCode(wrapped(pg('42601')))).toBeNull()
})

test('trùng theo constraint đã khai báo thì ra mã riêng', () => {
  CONSTRAINT_CODES['vi_du_pkey'] = 'not_found'
  try {
    expect(pgErrorCode(pg('23505', 'vi_du_pkey'))).toBe('not_found')
  } finally {
    delete CONSTRAINT_CODES['vi_du_pkey']
  }
})

test('toApiError dùng mã của lỗi Postgres; lỗi Postgres lạ thành internal_error', () => {
  expect(toApiError(wrapped(pg('23505', 'x_key')))).toMatchObject({ status: 409, code: 'conflict' })
  expect(toApiError(wrapped(pg('57014')))).toMatchObject({ status: 503, code: 'timeout' })
  expect(toApiError(wrapped(pg('42601')))).toMatchObject({ status: 500, code: 'internal_error' })
})
