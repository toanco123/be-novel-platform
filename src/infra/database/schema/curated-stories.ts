// Truyện chọn tay cho trang chủ: đúng định nghĩa bảng curated_stories của Supabase. Quản trị viên
// sửa ở đợt Quản trị; danh sách trống thì trang chủ tự chọn.
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import { stories } from './stories'

export const curatedStories = pgTable(
  'curated_stories',
  {
    /** featured: banner nổi bật; editor_pick: truyện đề cử */
    list: text().notNull(),
    storyId: uuid().notNull(),
    position: smallint().notNull().default(0),
  },
  (t) => [
    primaryKey({ name: 'curated_stories_pkey', columns: [t.list, t.storyId] }),
    foreignKey({
      name: 'curated_stories_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    check('curated_stories_list_check', sql`${t.list} in ('featured', 'editor_pick')`),
    index('curated_stories_story_id_idx').on(t.storyId),
  ],
)
