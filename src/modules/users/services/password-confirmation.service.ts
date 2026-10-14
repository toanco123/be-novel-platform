// Kiểm tra mật khẩu hiện tại của người đang đăng nhập trước thao tác nhạy cảm (đổi mật khẩu, xóa tài
// khoản). Sai 5 lần / 15 phút thì rate_limited, kể cả khi lần sau nhập đúng.
import { Injectable } from '@nestjs/common'
import { PasswordService } from '@/common/crypto/password.service'
import { AppException } from '@/common/errors/app.exception'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { WRONG_PASSWORD_LIMIT } from '../users.constants'
import type { PasswordOwner } from '../users.types'

@Injectable()
export class PasswordConfirmationService {
  constructor(
    private readonly passwords: PasswordService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Sai (hoặc tài khoản không có mật khẩu) → invalid_credentials; hết lượt → rate_limited */
  async confirm(user: PasswordOwner, password: string) {
    const key = `users:wrong-password:user:${user.id}`
    const { allowed, retryAfterSeconds } = await this.rateLimit.peek(key, WRONG_PASSWORD_LIMIT)
    if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    const check = user.passwordHash
      ? await this.passwords.verify(password, user.passwordHash)
      : await this.passwords.verifyDummy(password)
    if (!check.ok) {
      await this.rateLimit.consume(key, WRONG_PASSWORD_LIMIT)
      throw new AppException('invalid_credentials')
    }
    await this.rateLimit.reset(key)
  }
}
