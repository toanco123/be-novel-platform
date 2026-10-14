import { Module } from '@nestjs/common'
import { UsersModule } from '@/modules/users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { SessionService } from './services/session.service'
import { SessionsRepository } from './sessions.repository'

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionsRepository],
  exports: [SessionService],
})
export class AuthModule {}
