import { Inject, type OnApplicationShutdown } from '@nestjs/common'
import type { Redis } from 'ioredis'
import { REDIS } from './redis.constants'

/** Đóng kết nối Redis khi app tắt (enableShutdownHooks) */
export class RedisLifecycle implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect())
  }
}
