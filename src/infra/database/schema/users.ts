// Tài khoản (thay auth.users của Supabase) và hồ sơ công khai (giống bảng profiles của Supabase,
// cùng id) — giữ tên bảng, cột để chuyển dữ liệu từ Supabase bằng script sau này.
import { sql } from 'drizzle-orm'
import { check, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { citext } from './types'

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

export const profiles = pgTable(
  'profiles',
  {
    id: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text().notNull(),
    avatarUrl: text(),
    ...timestamps,
  },
  (t) => [
    check('profiles_display_name_length', sql`char_length(${t.displayName}) between 2 and 50`),
  ],
)

export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect
