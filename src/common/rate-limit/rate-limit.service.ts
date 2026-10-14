// Hạn mức nghiệp vụ theo cửa sổ trượt trên Redis (vd tạo 10 thể loại / ngày, đăng nhập sai 5 lần),
// bằng script Lua ở sliding-window.script.ts. Khác throttler (chặn spam thô theo request): service
// gọi khi cần.
import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import type { Redis } from 'ioredis'
import { REDIS } from '@/infra/redis/redis.constants'
import { AppException } from '../errors/app.exception'
import { RATE_LIMIT_KEY_PREFIX } from './rate-limit.constants'
import type { RateLimitOptions, RateLimitResult, SlidingWindowRedis } from './rate-limit.types'
import { SLIDING_WINDOW_SCRIPT } from './sliding-window.script'

@Injectable()
export class RateLimitService {
  private readonly redis: SlidingWindowRedis

  constructor(@Inject(REDIS) redis: Redis) {
    // defineCommand dùng EVALSHA (script nạp một lần), tự nạp lại khi Redis khởi động lại
    redis.defineCommand('slidingWindow', { numberOfKeys: 1, lua: SLIDING_WINDOW_SCRIPT })
    this.redis = redis as SlidingWindowRedis
  }

  /** Tính một lượt; hết lượt thì ném AppException('rate_limited', { retryAfterSeconds }) */
  async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const result = await this.run(key, options, true)
    if (!result.allowed) {
      throw new AppException('rate_limited', { retryAfterSeconds: result.retryAfterSeconds })
    }
    return result
  }

  /** Xem còn bao nhiêu lượt, không tính lượt nào */
  peek(key: string, options: RateLimitOptions) {
    return this.run(key, options, false)
  }

  /** Xóa đếm (vd đăng nhập đúng thì bỏ đếm số lần sai) */
  async reset(key: string) {
    await this.redis.del(RATE_LIMIT_KEY_PREFIX + key)
  }

  private async run(key: string, { limit, windowSeconds }: RateLimitOptions, consume: boolean) {
    const now = Date.now()
    const [allowed, used, retryAfterMs] = await this.redis.slidingWindow(
      RATE_LIMIT_KEY_PREFIX + key,
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
