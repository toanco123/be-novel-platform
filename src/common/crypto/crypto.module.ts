import { Global, Module } from '@nestjs/common'
import { IpHashService } from './ip-hash.service'
import { PasswordService } from './password.service'

/**
 * Băm dùng chung: mật khẩu (đăng nhập, đổi mật khẩu, xác nhận xóa tài khoản...), IP (liên hệ, lượt
 * đọc của khách)
 */
@Global()
@Module({ providers: [PasswordService, IpHashService], exports: [PasswordService, IpHashService] })
export class CryptoModule {}
