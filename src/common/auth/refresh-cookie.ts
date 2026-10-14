// Cookie refresh token của web: HttpOnly, SameSite=Lax, chỉ gửi kèm /v1/auth/*.
import type { CookieOptions, Request, Response } from 'express'
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './auth.constants'

/** Đặt và xóa cookie phải cùng tùy chọn thì trình duyệt mới xóa được */
const cookieOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
})

export function setRefreshCookie(res: Response, token: string, expires: Date, secure: boolean) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(secure), expires })
}

export function clearRefreshCookie(res: Response, secure: boolean) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions(secure))
}

/** Refresh token của request: trong body (mobile) hoặc cookie (web) */
export function readRefreshToken(req: Request, bodyToken: string | undefined) {
  const cookie: unknown = req.cookies?.[REFRESH_COOKIE]
  return bodyToken ?? (typeof cookie === 'string' && cookie ? cookie : undefined)
}
