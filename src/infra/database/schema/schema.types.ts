import type { profiles } from './profiles'
import type { refreshTokens } from './refresh-tokens'
import type { users } from './users'

/** Một dòng của bảng (kiểu Drizzle suy ra từ schema) */
export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect
export type RefreshTokenRow = typeof refreshTokens.$inferSelect
