import type { RefreshTokenRow } from '@/infra/database/schema'
import { REUSE_GRACE_MS } from './auth.constants'
import type { RefreshTokenState } from './auth.types'

/** Trạng thái của refresh token client gửi lên (xem RefreshTokenState) */
export function refreshTokenState(
  row: Pick<RefreshTokenRow, 'expiresAt' | 'revokedAt' | 'replacedById'>,
  now = new Date(),
): RefreshTokenState {
  if (row.revokedAt) {
    if (!row.replacedById) return 'revoked'
    return now.getTime() - row.revokedAt.getTime() <= REUSE_GRACE_MS ? 'grace' : 'reused'
  }
  return row.expiresAt.getTime() <= now.getTime() ? 'expired' : 'active'
}
