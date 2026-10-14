// Refresh token: chuỗi ngẫu nhiên 32 byte (base64url) gửi cho client, DB chỉ lưu SHA-256.
import { createHash, randomBytes } from 'node:crypto'
import type { RefreshTokenRow } from '@/infra/database/schema'

/** Hai tab cùng refresh: token vừa bị thay trong khoảng này thì không coi là bị đánh cắp */
export const REUSE_GRACE_MS = 10_000

export const newRefreshToken = () => randomBytes(32).toString('base64url')

export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex')

/**
 * Trạng thái của refresh token client gửi lên:
 * - `active`: dùng được (xoay vòng)
 * - `expired`: hết hạn phiên
 * - `revoked`: đã thu hồi do đăng xuất / khóa (không có token thay)
 * - `grace`: vừa bị thay trong REUSE_GRACE_MS (hai tab cùng refresh), không thu hồi cả họ
 * - `reused`: đã bị thay từ lâu mà vẫn được gửi lại, nghi bị đánh cắp: thu hồi cả họ
 */
export type RefreshTokenState = 'active' | 'expired' | 'revoked' | 'grace' | 'reused'

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
