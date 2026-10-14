import type { ProfileRow, UserRow } from '@/infra/database/schema'

/** Tài khoản kèm hồ sơ (dữ liệu của /v1/me) */
export type UserWithProfile = Pick<
  UserRow,
  'id' | 'email' | 'role' | 'emailVerifiedAt' | 'bannedUntil' | 'createdAt'
> &
  Pick<ProfileRow, 'displayName' | 'avatarUrl'>

/** Dữ liệu tạo tài khoản mới kèm hồ sơ */
export type NewUserWithProfile = {
  email: string
  /** null: tài khoản chỉ đăng nhập bằng OAuth */
  passwordHash: string | null
  displayName: string
}
