import type { AppException } from '@/common/errors/app.exception'
import type { Tx } from '@/infra/database/database.types'
import type { EmailTokenRow } from '@/infra/database/schema'
import type { MeDto } from '@/modules/users/dto/me.dto'

/**
 * Trạng thái của refresh token client gửi lên:
 * - `active`: dùng được (xoay vòng)
 * - `expired`: hết hạn phiên
 * - `revoked`: đã thu hồi do đăng xuất / khóa (không có token thay)
 * - `grace`: vừa bị thay trong REUSE_GRACE_MS (hai tab cùng refresh), không thu hồi cả họ
 * - `reused`: đã bị thay từ lâu mà vẫn được gửi lại, nghi bị đánh cắp: thu hồi cả họ
 */
export type RefreshTokenState = 'active' | 'expired' | 'revoked' | 'grace' | 'reused'

/** Dòng refresh_tokens mới (DB tự sinh id, created_at) */
export type NewRefreshToken = {
  userId: string
  familyId: string
  tokenHash: string
  expiresAt: Date
  userAgent: string | null
  ip: string | null
}

/** Phiên vừa mở hoặc vừa xoay vòng */
export type IssuedSession = {
  userId: string
  /** id của phiên (family_id) */
  sessionId: string
  /** Refresh token gửi cho client (DB chỉ có hash) */
  refreshToken: string
  expiresAt: Date
}

/** Kết quả transaction xoay vòng: lỗi được ném sau khi transaction ghi xong */
export type RotateResult = { error: AppException } | { session: IssuedSession }

/** Kiểm tra chủ phiên trước khi xoay (vd tài khoản bị khóa); trả lỗi thì thu hồi cả phiên */
export type RotateCheck = (userId: string, tx: Tx) => Promise<AppException | null>

/** Kết quả đăng ký / đăng nhập / refresh; controller quyết định refresh token đi cookie hay body */
export type AuthResult = {
  user: MeDto
  accessToken: string
  expiresIn: number
  refreshToken: string
  refreshExpiresAt: Date
}

/** Người nhận thư có link (xác nhận email, đặt lại mật khẩu) */
export type EmailLinkInput = { to: string; displayName: string; url: string }

/** Dòng email_tokens cần để kiểm tra link, kèm email hiện tại của tài khoản */
export type EmailTokenWithUser = Pick<
  EmailTokenRow,
  'id' | 'userId' | 'email' | 'expiresAt' | 'usedAt'
> & { userEmail: string }

/** Nội dung thư dựng theo khung chung (chữ thuần; khung tự escape khi dựng HTML) */
export type MailLayoutInput = {
  title: string
  greeting: string
  paragraphs: string[]
  action: { label: string; url: string }
  footer: string
}
