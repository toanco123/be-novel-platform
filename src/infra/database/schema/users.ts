// Tài khoản (thay auth.users của Supabase): giữ tên cột, UUID để chuyển dữ liệu từ Supabase bằng
// script sau này.
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { citext } from './citext'

export const userRole = pgEnum('user_role', ['user', 'admin'])

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: citext().notNull().unique(),
  /** argon2id; null: tài khoản chỉ đăng nhập bằng Google / Facebook / Apple. Hash bcrypt của user
   * chuyển từ Supabase được băm lại bằng argon2id ở lần đăng nhập đầu */
  passwordHash: text(),
  emailVerifiedAt: timestamp({ withTimezone: true }),
  role: userRole().notNull().default('user'),
  /** Khóa tới thời điểm này (null: không khóa) */
  bannedUntil: timestamp({ withTimezone: true }),
  banReason: text(),
  lastSignInAt: timestamp({ withTimezone: true }),
  ...timestamps,
})
