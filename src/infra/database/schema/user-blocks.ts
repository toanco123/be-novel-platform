// Chặn người dùng: đúng định nghĩa bảng user_blocks của Supabase (blocker_id trỏ users thay
// auth.users), trừ default auth.uid(). Người chặn không thấy bình luận của người bị chặn.
import { sql } from 'drizzle-orm'
import { check, foreignKey, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { profiles } from './profiles'
import { users } from './users'

export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerId: uuid().notNull(),
    /** Khóa ngoại sang profiles để lấy tên, ảnh người bị chặn (danh sách đã chặn) */
    blockedId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'user_blocks_pkey', columns: [t.blockerId, t.blockedId] }),
    foreignKey({
      name: 'user_blocks_blocker_id_fkey',
      columns: [t.blockerId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'user_blocks_blocked_id_fkey',
      columns: [t.blockedId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    check('user_blocks_not_self', sql`${t.blockerId} <> ${t.blockedId}`),
    index('user_blocks_blocked_id_idx').on(t.blockedId),
  ],
)
