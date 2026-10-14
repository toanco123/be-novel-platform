// Lượt đọc theo chương, theo ngày giờ Việt Nam: đúng định nghĩa bảng chapter_views của Supabase.
// Index chapter_views_day_story_idx (day, story_id) include (views) tạo trong migration
// 0009_catalog_triggers vì Drizzle chưa viết được include.
import { sql } from 'drizzle-orm'
import { check, date, foreignKey, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core'
import { chapters } from './chapters'

export const chapterViews = pgTable(
  'chapter_views',
  {
    storyId: uuid().notNull(),
    chapterNumber: integer().notNull(),
    day: date().notNull(),
    views: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ name: 'chapter_views_pkey', columns: [t.storyId, t.chapterNumber, t.day] }),
    foreignKey({
      name: 'chapter_views_story_id_chapter_number_fkey',
      columns: [t.storyId, t.chapterNumber],
      foreignColumns: [chapters.storyId, chapters.number],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    check('chapter_views_views_check', sql`${t.views} >= 0`),
  ],
)
