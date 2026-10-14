// Token trong link email (xác nhận email, đặt lại mật khẩu): client giữ chuỗi gốc trong link, DB chỉ
// lưu SHA-256; dùng một lần, có hạn.
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { citext } from './citext'
import { users } from './users'

export const emailTokenPurpose = pgEnum('email_token_purpose', ['verify_email', 'reset_password'])

export const emailTokens = pgTable(
  'email_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: emailTokenPurpose().notNull(),
    /** Email lúc gửi link: email của tài khoản đổi (sau này) thì link cũ vô hiệu */
    email: citext().notNull(),
    tokenHash: text().notNull().unique('email_tokens_token_hash_unique'),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    /** Đã dùng, hoặc bị thay bởi link mới cùng mục đích */
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.purpose)],
)
