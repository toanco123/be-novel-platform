// Lịch sử đọc (mỗi truyện một dòng: chỗ đọc dở): đúng định nghĩa bảng reading_history của Supabase,
// trừ default auth.uid() của user_id. Không có khóa ngoại tới chương để lịch sử vẫn còn khi tác giả
// ẩn / xóa chương.
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { profiles } from './profiles'
import { stories } from './stories'

export const readingHistory = pgTable(
  'reading_history',
  {
    userId: uuid().notNull(),
    storyId: uuid().notNull(),
    chapterNumber: integer().notNull(),
    chapterTitle: text().notNull().default(''),
    /** Tỉ lệ đã cuộn trong chương, 0–1 */
    progress: real().notNull().default(0),
    readAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'reading_history_pkey', columns: [t.userId, t.storyId] }),
    foreignKey({
      name: 'reading_history_user_id_fkey',
      columns: [t.userId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'reading_history_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    check('reading_history_chapter_number_check', sql`${t.chapterNumber} between 1 and 99999`),
    check('reading_history_chapter_title_check', sql`char_length(${t.chapterTitle}) <= 120`),
    check('reading_history_progress_check', sql`${t.progress} between 0 and 1`),
    index('reading_history_user_id_read_at_idx').on(t.userId, t.readAt.desc().nullsFirst()),
    index('reading_history_story_id_idx').on(t.storyId),
  ],
)
