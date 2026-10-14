import type { Request } from 'express'
import type { Redis } from 'ioredis'

export type RateLimitOptions = {
  /** Số lượt tối đa trong cửa sổ */
  limit: number
  /** Độ dài cửa sổ (giây) */
  windowSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  /** Số lượt đã dùng trong cửa sổ (kể cả lượt vừa tính) */
  used: number
  remaining: number
  /** Hết lượt: bao lâu nữa (giây) thì lượt cũ nhất hết hạn; còn lượt: 0 */
  retryAfterSeconds: number
}

/** Client Redis đã nạp script cửa sổ trượt (defineCommand) */
export type SlidingWindowRedis = Redis & {
  slidingWindow(
    key: string,
    now: number,
    windowMs: number,
    limit: number,
    member: string,
    consume: '1' | '0',
  ): Promise<[number, number, number]>
}

/** Phần cần dùng của request để đếm throttle (JwtAuthGuard gắn req.user, chạy trước) */
export type ThrottleRequest = Pick<Request, 'ip'> & { user?: { id: string } }
