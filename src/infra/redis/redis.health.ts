import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import type { Redis } from 'ioredis'
import { withTimeout } from '@/common/utils/with-timeout'
import { REDIS, REDIS_HEALTH_TIMEOUT_MS } from './redis.constants'

/** Redis trả lời PING trong 2 giây thì coi là sống */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'redis') {
    const indicator = this.health.check(key)
    try {
      await withTimeout(this.redis.ping(), REDIS_HEALTH_TIMEOUT_MS)
      return indicator.up()
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unknown' })
    }
  }
}
