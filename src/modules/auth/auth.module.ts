import { Module } from '@nestjs/common'
import { UsersModule } from '@/modules/users/users.module'
import { AccountPasswordController } from './controllers/account-password.controller'
import { AuthController } from './controllers/auth.controller'
import { EmailVerificationController } from './controllers/email-verification.controller'
import { OAuthAccountsRepository } from './oauth/oauth-accounts.repository'
import { OAuthController } from './oauth/oauth.controller'
import { AppleOAuthClient } from './oauth/providers/apple-oauth.client'
import { FacebookOAuthClient } from './oauth/providers/facebook-oauth.client'
import { GoogleOAuthClient } from './oauth/providers/google-oauth.client'
import { OAuthStoreService } from './oauth/services/oauth-store.service'
import { OAuthService } from './oauth/services/oauth.service'
import { EmailTokensRepository } from './repositories/email-tokens.repository'
import { SessionsRepository } from './repositories/sessions.repository'
import { AccountPasswordService } from './services/account-password.service'
import { AuthService } from './services/auth.service'
import { EmailTokenService } from './services/email-token.service'
import { EmailVerificationService } from './services/email-verification.service'
import { SessionService } from './services/session.service'

@Module({
  imports: [UsersModule],
  controllers: [
    AuthController,
    EmailVerificationController,
    AccountPasswordController,
    OAuthController,
  ],
  providers: [
    AuthService,
    SessionService,
    EmailTokenService,
    EmailVerificationService,
    AccountPasswordService,
    SessionsRepository,
    EmailTokensRepository,
    OAuthService,
    OAuthStoreService,
    OAuthAccountsRepository,
    GoogleOAuthClient,
    FacebookOAuthClient,
    AppleOAuthClient,
  ],
  exports: [SessionService],
})
export class AuthModule {}
