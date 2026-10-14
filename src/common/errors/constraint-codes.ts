import type { ErrorCode } from './errors.types'

/**
 * Tên constraint unique → mã lỗi riêng (vd `genres_pkey` → `genre_exists`). Module thêm vào đây khi
 * cần báo trùng rõ ràng hơn `conflict`
 */
export const CONSTRAINT_CODES: Record<string, ErrorCode> = {
  users_email_unique: 'email_taken',
  genres_pkey: 'genre_exists',
}
