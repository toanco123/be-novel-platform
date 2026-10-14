import { Module } from '@nestjs/common'
import { UsersModule } from '@/modules/users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { PasswordService } from './services/password.service'
import { SessionService } from './services/session.service'
import { SessionsRepository } from './sessions.repository'

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionsRepository],
  exports: [SessionService],
})
export class AuthModule {}
