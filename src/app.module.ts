import { Module } from '@nestjs/common'
import { AppConfigModule } from './config/app-config'
import { ContextModule } from './core/context/context.module'
import { CoreModule } from './core/core.module'
import { RateLimitModule } from './core/rate-limit/rate-limit.module'
import { DatabaseModule } from './infra/database/database.module'
import { QueueModule } from './infra/queue/queue.module'
import { RedisModule } from './infra/redis/redis.module'
import { HealthModule } from './modules/health/health.module'

@Module({
  imports: [
    AppConfigModule,
    ContextModule,
    CoreModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    QueueModule,
    HealthModule,
  ],
})
export class AppModule {}
