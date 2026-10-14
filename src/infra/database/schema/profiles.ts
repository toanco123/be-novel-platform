// Hồ sơ công khai (giống bảng profiles của Supabase, cùng id với users), tạo cùng lúc với tài khoản.
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
  (t) => [
    check('profiles_display_name_length', sql`char_length(${t.displayName}) between 2 and 50`),
  ],
)
