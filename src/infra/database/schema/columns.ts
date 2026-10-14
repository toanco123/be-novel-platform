import { timestamp } from 'drizzle-orm/pg-core'

/**
 * created_at, updated_at cho bảng có sửa. updated_at do trigger set_updated_at() ghi (migration
 * đầu), bảng mới thêm trigger trong migration của mình
 */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}
