// Theo dõi truyện: đúng định nghĩa bảng follows của Supabase, trừ default auth.uid() của user_id.
// Mốc "đã thấy" và số người theo dõi do trigger tính (migration follows_triggers).
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { profiles } from './profiles'
import { stories } from './stories'

export const follows = pgTable(
  'follows',
  {
    userId: uuid().notNull(),
    storyId: uuid().notNull(),
    followedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Chương mới nhất người dùng đã thấy; số chương mới = chương đã xuất bản có số lớn hơn mốc này */
    seenChapter: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ name: 'follows_pkey', columns: [t.userId, t.storyId] }),
    foreignKey({
      name: 'follows_user_id_fkey',
      columns: [t.userId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'follows_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    check('follows_seen_chapter_check', sql`${t.seenChapter} >= 0`),
    index('follows_story_id_idx').on(t.storyId),
  ],
)
