// Refresh token (chỉ lưu SHA-256). Mỗi lần đăng nhập mở một "phiên" = một họ token (family_id);
// mỗi lần refresh tạo token mới cùng họ và thu hồi token cũ (xoay vòng).
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Một phiên đăng nhập; cũng là `sid` trong access token */
    familyId: uuid().notNull(),
    tokenHash: text().notNull().unique('refresh_tokens_token_hash_unique'),
    /** Hạn của cả họ (tính từ lúc đăng nhập), token xoay vòng giữ nguyên */
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    /** Token mới thay token này khi refresh (null: bị thu hồi do đăng xuất, khóa...) */
    replacedById: uuid(),
    userAgent: text(),
    ip: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.userId), index().on(t.familyId)],
)
