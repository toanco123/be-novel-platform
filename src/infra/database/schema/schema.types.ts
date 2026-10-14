import type { emailTokens } from './email-tokens'
import type { oauthAccounts } from './oauth-accounts'
import type { profiles } from './profiles'
import type { refreshTokens } from './refresh-tokens'
import type { users } from './users'

/** Một dòng của bảng (kiểu Drizzle suy ra từ schema) */
export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect
export type RefreshTokenRow = typeof refreshTokens.$inferSelect
export type EmailTokenRow = typeof emailTokens.$inferSelect
export type EmailTokenPurpose = EmailTokenRow['purpose']
export type OAuthAccountRow = typeof oauthAccounts.$inferSelect
export type OAuthProvider = OAuthAccountRow['provider']
