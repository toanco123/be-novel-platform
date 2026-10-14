import { Global, Module } from '@nestjs/common'
import { seconds, ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'
import type { Redis } from 'ioredis'
import { AppConfig } from '@/config/app-config'
import { REDIS } from '@/infra/redis/redis.module'
import { RateLimitService } from './rate-limit.service'

/**
 * Cấu hình throttler (lưu trên Redis, dùng chung giữa các instance) + RateLimitService. Guard
 * AppThrottlerGuard đăng ký ở AppModule, sau JwtAuthGuard
 */
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
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
