// Client đang gọi API: web hay app di động, IP và trình duyệt / thiết bị (lưu kèm phiên).
import type { Request } from 'express'
import { CLIENT_HEADER, MOBILE_CLIENT } from './auth.constants'
import type { ClientMeta } from './auth.types'

/** App di động (header X-Client: mobile): refresh token đi trong body thay vì cookie */
export const isMobileClient = (req: Request) =>
  req.get(CLIENT_HEADER)?.toLowerCase() === MOBILE_CLIENT

export function clientMeta(req: Request): ClientMeta {
  return { ip: req.ip ?? null, userAgent: req.get('user-agent')?.slice(0, 512) ?? null }
}
