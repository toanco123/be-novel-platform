import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AppConfigModule } from './config/app-config'
import { AuthCoreModule } from './core/auth/auth-core.module'
import { JwtAuthGuard } from './core/auth/jwt-auth.guard'
import { RolesGuard } from './core/auth/roles.guard'
import { ContextModule } from './core/context/context.module'
import { CoreModule } from './core/core.module'
import { AppThrottlerGuard } from './core/rate-limit/app-throttler.guard'
import { RateLimitModule } from './core/rate-limit/rate-limit.module'
import { DatabaseModule } from './infra/database/database.module'
import { QueueModule } from './infra/queue/queue.module'
import { RedisModule } from './infra/redis/redis.module'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { UsersModule } from './modules/users/users.module'

@Module({
  imports: [
    AppConfigModule,
    ContextModule,
    CoreModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    QueueModule,
    AuthCoreModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  // Guard toàn cục chạy theo thứ tự khai báo: xác thực trước để throttler đếm theo user
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
