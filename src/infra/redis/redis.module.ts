import { Global, Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { Redis } from 'ioredis'
import { AppConfig } from '@/config/app-config.service'
import { REDIS } from './redis.constants'
import { RedisHealthIndicator } from './redis.health'
import { RedisLifecycle } from './redis.lifecycle'

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
