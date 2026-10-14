// Tài khoản mạng xã hội liên kết với user (thay auth.identities của Supabase): mỗi người ở mỗi
// provider (sub / id của provider) liên kết với đúng một user.
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { citext } from './citext'
import { users } from './users'

export const oauthProvider = pgEnum('oauth_provider', ['google', 'facebook', 'apple'])

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    provider: oauthProvider().notNull(),
    providerUserId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Email provider báo lúc liên kết (có thể khác email tài khoản, vd địa chỉ ẩn của Apple) */
    email: citext(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSignInAt: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerUserId] }), index().on(t.userId)],
)
