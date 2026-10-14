import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common'
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus'
import { Redis } from 'ioredis'
import { AppConfig } from '@/config/app-config'

/** Token inject client Redis dùng chung (rate limit, health): @Inject(REDIS) redis: Redis */
export const REDIS = Symbol('REDIS')

const HEALTH_TIMEOUT_MS = 2000

class RedisLifecycle implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect())
  }
}

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
          timer = setTimeout(() => reject(new Error('timeout')), HEALTH_TIMEOUT_MS)
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

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: REDIS,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        new Redis(config.get('REDIS_URL'), {
          connectionName: 'novel-api',
          // Lỗi nhanh thay vì treo request khi Redis mất kết nối
          maxRetriesPerRequest: 2,
        }),
    },
    RedisLifecycle,
    RedisHealthIndicator,
  ],
  exports: [REDIS, RedisHealthIndicator],
})
export class RedisModule {}
