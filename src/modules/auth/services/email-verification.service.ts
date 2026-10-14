// Xác nhận email: gửi thư có link khi đăng ký (và khi người dùng bấm gửi lại), đánh dấu đã xác nhận
// khi bấm link. Chưa xác nhận vẫn đăng nhập được; thao tác viết gắn @RequireVerifiedEmail().
import { Inject, Injectable } from '@nestjs/common'
import { AppException } from '@/common/errors/app.exception'
import { ErrorLogger } from '@/common/errors/error-logger.service'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { MailQueueService } from '@/infra/mail/services/mail-queue.service'
import { UsersRepository } from '@/modules/users/users.repository'
import { RESEND_VERIFICATION_LIMIT } from '../auth.constants'
import { verifyEmailTemplate } from '../templates/verify-email.template'
import { EmailTokenService } from './email-token.service'

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UsersRepository,
    private readonly links: EmailTokenService,
    private readonly mail: MailQueueService,
    private readonly rateLimit: RateLimitService,
    private readonly errors: ErrorLogger,
  ) {}

  /** Sau đăng ký: lỗi (vd Redis) không làm hỏng việc đăng ký, ghi log; người dùng tự gửi lại được */
  async sendAfterRegister(user: { id: string; email: string; displayName: string }) {
    try {
      await this.send(user)
    } catch (error) {
      this.errors.log(error, { action: 'send_verification_email', userId: user.id })
    }
  }

  /** Người dùng bấm "Gửi lại": đã xác nhận thì thôi; 3 lần / giờ */
  async resend(userId: string) {
    const user = await this.users.findWithProfile(userId)
    if (!user) throw new AppException('not_found')
    if (user.emailVerifiedAt) return
    await this.rateLimit.consume(
      `auth:resend-verification:user:${userId}`,
      RESEND_VERIFICATION_LIMIT,
    )
    await this.send(user)
  }

  /** Bấm link trong thư; sai, hết hạn, đã dùng → invalid_link */
  async verify(token: string) {
    await this.db.transaction(async (tx) => {
      const userId = await this.links.consume(token, 'verify_email', tx)
      await this.users.markEmailVerified(userId, tx)
    })
  }

  private async send(user: { id: string; email: string; displayName: string }) {
    const url = await this.links.createLink(user, 'verify_email')
    await this.mail.send(
      verifyEmailTemplate({ to: user.email, displayName: user.displayName, url }),
    )
  }
}
