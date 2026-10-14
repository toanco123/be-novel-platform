import { Module } from '@nestjs/common'
import { MeController } from './me.controller'
import { PasswordConfirmationService } from './services/password-confirmation.service'
import { UsersService } from './services/users.service'
import { UsersRepository } from './users.repository'

@Module({
  controllers: [MeController],
  providers: [UsersRepository, UsersService, PasswordConfirmationService],
  exports: [UsersRepository, UsersService, PasswordConfirmationService],
})
export class UsersModule {}
