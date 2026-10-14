/** Một người mình đã chặn, kèm hồ sơ công khai */
export type BlockedUserRow = {
  id: string
  displayName: string
  avatarUrl: string | null
  blockedAt: Date
}
