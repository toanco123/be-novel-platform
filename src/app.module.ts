import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthCoreModule } from './common/auth/auth-core.module'
import { EmailVerifiedGuard } from './common/auth/guards/email-verified.guard'
import { JwtAuthGuard } from './common/auth/guards/jwt-auth.guard'
import { RolesGuard } from './common/auth/guards/roles.guard'
import { CaptchaModule } from './common/captcha/captcha.module'
import { CommonModule } from './common/common.module'
import { ContextModule } from './common/context/context.module'
import { CryptoModule } from './common/crypto/crypto.module'
import { ErrorsModule } from './common/errors/errors.module'
import { AppThrottlerGuard } from './common/rate-limit/app-throttler.guard'
import { RateLimitModule } from './common/rate-limit/rate-limit.module'
import { AppConfigModule } from './config/app-config.module'
import { DatabaseModule } from './infra/database/database.module'
import { MailModule } from './infra/mail/mail.module'
import { QueueModule } from './infra/queue/queue.module'
import { RedisModule } from './infra/redis/redis.module'
import { StorageModule } from './infra/storage/storage.module'
import { AuthModule } from './modules/auth/auth.module'
import { ChaptersModule } from './modules/chapters/chapters.module'
import { GenresModule } from './modules/genres/genres.module'
import { HealthModule } from './modules/health/health.module'
import { LibraryModule } from './modules/library/library.module'
import { RatingsModule } from './modules/ratings/ratings.module'
import { StoriesModule } from './modules/stories/stories.module'
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
    MailModule,
    StorageModule,
    AuthCoreModule,
    CryptoModule,
    CaptchaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GenresModule,
    StoriesModule,
    ChaptersModule,
    LibraryModule,
    RatingsModule,
  ],
  // Guard toàn cục chạy theo thứ tự khai báo: xác thực trước để throttler đếm theo user
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: EmailVerifiedGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
