import { Module } from '@nestjs/common'
import { UsersModule } from '@/modules/users/users.module'
import { AccountPasswordController } from './controllers/account-password.controller'
import { AuthController } from './controllers/auth.controller'
import { EmailVerificationController } from './controllers/email-verification.controller'
import { EmailTokensRepository } from './repositories/email-tokens.repository'
import { SessionsRepository } from './repositories/sessions.repository'
import { AccountPasswordService } from './services/account-password.service'
import { AuthService } from './services/auth.service'
import { EmailTokenService } from './services/email-token.service'
import { EmailVerificationService } from './services/email-verification.service'
import { SessionService } from './services/session.service'

@Module({
  imports: [UsersModule],
  controllers: [AuthController, EmailVerificationController, AccountPasswordController],
  providers: [
    AuthService,
    SessionService,
    EmailTokenService,
    EmailVerificationService,
    AccountPasswordService,
    SessionsRepository,
    EmailTokensRepository,
  ],
  exports: [SessionService],
})
export class AuthModule {}
