import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import type { Redis } from 'ioredis'
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
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), REDIS_HEALTH_TIMEOUT_MS)
        }),
      ])
      return indicator.up()
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unknown' })
    } finally {
      clearTimeout(timer)
    }
  }
}
