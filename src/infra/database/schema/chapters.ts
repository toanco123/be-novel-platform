// Chương: đúng định nghĩa bảng chapters của Supabase (gồm content tới 200 000 ký tự và giờ hẹn).
// Luật của trigger chapters_before_change (published_at, khóa số chương, chương công khai cuối
// cùng, giờ hẹn) viết trong service ở đợt Sáng tác; số liệu story_stats do trigger
// chapters_after_change tính (migration 0009_catalog_triggers).
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { stories } from './stories'
import { publicationStatus } from './story-enums'

export const chapters = pgTable(
  'chapters',
  {
    id: uuid().primaryKey().defaultRandom(),
    storyId: uuid().notNull(),
    /** Tác giả tự chọn, được bỏ trống số ở giữa; chương đã từng xuất bản thì giữ nguyên số */
    number: integer().notNull(),
    title: text().notNull().default(''),
    /** HTML rút gọn của trình soạn hoặc văn bản thuần kiểu cũ */
    content: text().notNull(),
    status: publicationStatus().notNull().default('draft'),
    ...timestamps,
    /** Lần đầu xuất bản; ẩn rồi xuất bản lại vẫn giữ mốc cũ */
    publishedAt: timestamp({ withTimezone: true }),
    /** Giờ hẹn tự xuất bản (chỉ chương nháp); null: không hẹn */
    scheduledAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: 'chapters_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    unique('chapters_story_id_number_key').on(t.storyId, t.number),
    check('chapters_number_check', sql`${t.number} between 1 and 99999`),
    check('chapters_title_check', sql`char_length(${t.title}) <= 120`),
    check('chapters_content_check', sql`char_length(${t.content}) between 1 and 200000`),
    check('chapters_scheduled_draft', sql`${t.scheduledAt} is null or ${t.status} = 'draft'`),
    index('chapters_scheduled_at_idx')
      .on(t.scheduledAt)
      .where(sql`${t.scheduledAt} is not null`),
  ],
)
