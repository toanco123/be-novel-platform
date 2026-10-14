import { Global, Module } from '@nestjs/common'
import { TokenService } from './token.service'

/** TokenService dùng chung (guard toàn cục và module auth) */
@Global()
@Module({ providers: [TokenService], exports: [TokenService] })
export class AuthCoreModule {}
