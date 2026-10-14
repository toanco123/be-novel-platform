// Thể loại: đúng định nghĩa bảng genres của Supabase (cột, check, khóa ngoại tới profiles). Slug luôn
// bằng slugify(name) (service tính, thay trigger genres_set_slug của Supabase).
import { sql } from 'drizzle-orm'
import { check, foreignKey, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { profiles } from './profiles'

export const genres = pgTable(
  'genres',
  {
    slug: text().primaryKey(),
    name: text().notNull(),
    description: text(),
    /** null: thể loại có sẵn của hệ thống (hoặc người tạo đã xóa tài khoản) */
    createdBy: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'genres_created_by_fkey',
      columns: [t.createdBy],
      foreignColumns: [profiles.id],
    }).onDelete('set null'),
    check('genres_slug_check', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('genres_name_check', sql`char_length(${t.name}) between 2 and 30`),
    check('genres_description_check', sql`char_length(${t.description}) <= 200`),
    index('genres_created_by_idx').on(t.createdBy),
  ],
)
