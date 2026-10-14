import type { Request } from 'express'

export type Role = 'user' | 'admin'

/** Người đang gọi API (lấy từ access token): req.user, CLS 'actor', @CurrentUser() */
export type Actor = {
  id: string
  role: Role
  /** Phiên đăng nhập (family_id của refresh token) */
  sessionId: string
}

export type AuthenticatedRequest = Request & { user?: Actor }
