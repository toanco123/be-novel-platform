import type { BlockedUserRow } from './blocks.types'
import type { BlockedUserDto } from './dto/blocked-user.dto'

export function toBlockedUser(row: BlockedUserRow): BlockedUserDto {
  return {
    user: { id: row.id, displayName: row.displayName, avatarUrl: row.avatarUrl },
    blockedAt: row.blockedAt.toISOString(),
  }
}
