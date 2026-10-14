// Hồ sơ công khai: đúng định nghĩa bảng profiles của Supabase (cột, check), cùng id với users; tạo
// cùng lúc với tài khoản.
import { sql } from 'drizzle-orm'
import { check, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { users } from './users'

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
  // Giống Supabase (tên constraint mặc định của Postgres cho check viết cùng cột)
  (t) => [
    check('profiles_display_name_check', sql`char_length(${t.displayName}) between 1 and 30`),
    check('profiles_avatar_url_check', sql`char_length(${t.avatarUrl}) <= 2048`),
  ],
)
