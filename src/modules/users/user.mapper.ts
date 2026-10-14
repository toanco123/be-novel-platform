import type { MeDto } from './dto/me.dto'
import type { UserWithProfile } from './users.types'

/** Dòng DB → hồ sơ của chính mình (không bao giờ có password_hash) */
export function toMe(row: UserWithProfile): MeDto {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    role: row.role,
    emailVerified: row.emailVerifiedAt !== null,
    createdAt: row.createdAt.toISOString(),
  }
}
