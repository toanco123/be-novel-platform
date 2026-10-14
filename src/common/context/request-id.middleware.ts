// Mỗi request một id: nhận lại x-request-id của client (hoặc proxy) nếu hợp lệ, không thì tự sinh.
// Gắn vào req.id (log của pino và CLS cùng đọc) và trả về trong header x-request-id.
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { REQUEST_ID_HEADER } from './context.constants'
import type { RequestWithId } from './context.types'

const VALID_ID = /^[A-Za-z0-9-]{1,64}$/

/** Id hợp lệ từ header, hoặc id mới */
export function resolveRequestId(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header
  return value && VALID_ID.test(value) ? value : randomUUID()
}

/** Middleware chạy đầu tiên (đăng ký trong bootstrap trước mọi middleware khác) */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = resolveRequestId(req.headers[REQUEST_ID_HEADER])
  ;(req as RequestWithId).id = id
  res.setHeader(REQUEST_ID_HEADER, id)
  next()
}
