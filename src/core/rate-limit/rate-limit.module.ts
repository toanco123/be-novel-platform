import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { seconds, ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'
import type { Redis } from 'ioredis'
import { AppConfig } from '@/config/app-config'
import { REDIS } from '@/infra/redis/redis.module'
import { AppThrottlerGuard } from './app-throttler.guard'
import { RateLimitService } from './rate-limit.service'

/** Throttler toàn cục (lưu trên Redis, dùng chung giữa các instance) + RateLimitService */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [AppConfig, REDIS],
      useFactory: (config: AppConfig, redis: Redis) => ({
        throttlers: [
          {
            name: 'default',
            ttl: seconds(config.get('THROTTLE_TTL_SECONDS')),
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }, RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
