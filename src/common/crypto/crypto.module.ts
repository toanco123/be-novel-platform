import { Global, Module } from '@nestjs/common'
import { PasswordService } from './password.service'

/** Băm / xác minh mật khẩu dùng chung (đăng nhập, đổi mật khẩu, xác nhận xóa tài khoản...) */
@Global()
@Module({ providers: [PasswordService], exports: [PasswordService] })
export class CryptoModule {}
