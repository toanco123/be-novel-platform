import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthCoreModule } from './common/auth/auth-core.module'
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard'
import { RolesGuard } from './common/auth/guards/roles.guard'
import { CommonModule } from './common/common.module'
import { ContextModule } from './common/context/context.module'
import { CryptoModule } from './common/crypto/crypto.module'
import { ErrorsModule } from './common/errors/errors.module'
import { AppThrottlerGuard } from './common/rate-limit/app-throttler.guard'
import { RateLimitModule } from './common/rate-limit/rate-limit.module'
import { AppConfigModule } from './config/app-config.module'
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
    ErrorsModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    RateLimitModule,
    QueueModule,
    AuthCoreModule,
    CryptoModule,
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
