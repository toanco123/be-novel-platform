import type { Request, Response } from 'express'
import { setRefreshCookie } from '@/common/auth/refresh-cookie'
import { isMobileClient } from '@/common/http/request-client'
import type { AuthResult } from './auth.types'
import type { AuthSessionDto } from './dto/auth-session.dto'

/** Trả phiên đăng nhập: mobile nhận refresh token trong body; web nhận cookie, body không có token */
export function sessionResponse(
  req: Request,
  res: Response,
  cookieSecure: boolean,
  result: AuthResult,
): AuthSessionDto {
  const { refreshToken, refreshExpiresAt, ...session } = result
  if (isMobileClient(req)) return { ...session, refreshToken }
  setRefreshCookie(res, refreshToken, refreshExpiresAt, cookieSecure)
  return session
}
