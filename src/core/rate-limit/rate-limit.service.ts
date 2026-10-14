// Hạn mức nghiệp vụ theo cửa sổ trượt trên Redis (vd tạo 10 thể loại / ngày, đăng nhập sai 5 lần).
// Mỗi lượt là một phần tử sorted set (điểm = thời điểm); script Lua đếm và ghi nguyên tử nên nhiều
// instance cùng lúc vẫn đúng. Khác throttler (chặn spam thô theo request): service gọi khi cần.
import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import type { Redis } from 'ioredis'
import { REDIS } from '@/infra/redis/redis.module'
import { AppError } from '../errors/app-error'

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

const KEY_PREFIX = 'rl:'

// KEYS[1] key; ARGV: now(ms), window(ms), limit, member, consume(1|0) → { allowed, used, retryAfterMs }
const SLIDING_WINDOW = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
local used = redis.call('ZCARD', KEYS[1])
if used < limit then
  if ARGV[5] == '1' then
    redis.call('ZADD', KEYS[1], now, ARGV[4])
    redis.call('PEXPIRE', KEYS[1], window)
    used = used + 1
  end
  return { 1, used, 0 }
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return { 0, used, tonumber(oldest[2]) + window - now }
`

type SlidingWindowRedis = Redis & {
  slidingWindow(
    key: string,
    now: number,
    windowMs: number,
    limit: number,
    member: string,
    consume: '1' | '0',
  ): Promise<[number, number, number]>
}

@Injectable()
export class RateLimitService {
  private readonly redis: SlidingWindowRedis

  constructor(@Inject(REDIS) redis: Redis) {
    // defineCommand dùng EVALSHA (script nạp một lần), tự nạp lại khi Redis khởi động lại
    redis.defineCommand('slidingWindow', { numberOfKeys: 1, lua: SLIDING_WINDOW })
    this.redis = redis as SlidingWindowRedis
  }

  /** Tính một lượt; hết lượt thì ném AppError('rate_limited', { retryAfterSeconds }) */
  async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const result = await this.run(key, options, true)
    if (!result.allowed) {
      throw new AppError('rate_limited', { retryAfterSeconds: result.retryAfterSeconds })
    }
    return result
  }

  /** Xem còn bao nhiêu lượt, không tính lượt nào */
  peek(key: string, options: RateLimitOptions) {
    return this.run(key, options, false)
  }

  /** Xóa đếm (vd đăng nhập đúng thì bỏ đếm số lần sai) */
  async reset(key: string) {
    await this.redis.del(KEY_PREFIX + key)
  }

  private async run(key: string, { limit, windowSeconds }: RateLimitOptions, consume: boolean) {
    const now = Date.now()
    const [allowed, used, retryAfterMs] = await this.redis.slidingWindow(
      KEY_PREFIX + key,
      now,
      windowSeconds * 1000,
      limit,
      `${now}-${randomUUID()}`,
      consume ? '1' : '0',
    )
    return {
      allowed: allowed === 1,
      used,
      remaining: Math.max(0, limit - used),
      retryAfterSeconds: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    }
  }
}
