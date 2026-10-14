// Mật khẩu của tài khoản: quên mật khẩu (gửi link), đặt lại bằng link, đổi khi biết mật khẩu cũ.
import { Inject, Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { PasswordService } from '@/common/crypto/password.service'
import { AppException } from '@/common/errors/app.exception'
import { ErrorLogger } from '@/common/errors/error-logger.service'
import type { ClientMeta } from '@/common/http/http.types'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { MailQueueService } from '@/infra/mail/services/mail-queue.service'
import { PasswordConfirmationService } from '@/modules/users/services/password-confirmation.service'
import { UsersRepository } from '@/modules/users/users.repository'
import type { UserWithProfile } from '@/modules/users/users.types'
import { FORGOT_PASSWORD_EMAIL_LIMIT, FORGOT_PASSWORD_IP_LIMIT } from '../auth.constants'
import { resetPasswordTemplate } from '../templates/reset-password.template'
import { EmailTokenService } from './email-token.service'
import { SessionService } from './session.service'

@Injectable()
export class AccountPasswordService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly confirmation: PasswordConfirmationService,
    private readonly sessions: SessionService,
    private readonly links: EmailTokenService,
    private readonly mail: MailQueueService,
    private readonly rateLimit: RateLimitService,
    private readonly errors: ErrorLogger,
  ) {}

  /**
   * Luôn xong như nhau dù email có tồn tại hay không (không lộ email đã đăng ký): gửi thư chạy nền
   * sau khi trả lời. Hạn mức: 10 lần / giờ / IP, 3 lần / giờ / email
   */
  async forgot(email: string, meta: ClientMeta) {
    await this.rateLimit.consume(
      `auth:forgot-password:ip:${meta.ip ?? 'unknown'}`,
      FORGOT_PASSWORD_IP_LIMIT,
    )
    await this.rateLimit.consume(`auth:forgot-password:email:${email}`, FORGOT_PASSWORD_EMAIL_LIMIT)
    const user = await this.users.findWithProfileByEmail(email)
    if (!user) return
    void this.sendResetLink(user).catch((error: unknown) =>
      this.errors.log(error, { action: 'send_reset_password_email', userId: user.id }),
    )
  }

  /**
   * Đặt mật khẩu mới bằng link: email coi như đã xác nhận (người dùng có hộp thư), mọi thiết bị bị
   * đăng xuất. Link sai, hết hạn, đã dùng → invalid_link
   */
  async reset(token: string, password: string) {
    const passwordHash = await this.passwords.hash(password)
    await this.db.transaction(async (tx) => {
      const userId = await this.links.consume(token, 'reset_password', tx)
      await this.users.updatePasswordHash(userId, passwordHash, tx)
      await this.users.markEmailVerified(userId, tx)
      await this.sessions.revokeAllForUser(userId, tx)
    })
  }

  /**
   * Đổi mật khẩu khi biết mật khẩu cũ: sai → invalid_credentials (5 lần / 15 phút), trùng mật khẩu
   * cũ → same_password. Đăng xuất các thiết bị khác, giữ phiên đang dùng
   */
  async change(actor: Actor, currentPassword: string, newPassword: string) {
    const user = await this.users.findById(actor.id)
    if (!user) throw new AppException('not_found')
    await this.confirmation.confirm(user, currentPassword)
    if (user.passwordHash && (await this.passwords.verify(newPassword, user.passwordHash)).ok) {
      throw new AppException('same_password')
    }
    const passwordHash = await this.passwords.hash(newPassword)
    await this.db.transaction(async (tx) => {
      await this.users.updatePasswordHash(actor.id, passwordHash, tx)
      await this.sessions.revokeOtherSessions(actor.id, actor.sessionId, tx)
    })
  }

  private async sendResetLink(user: UserWithProfile) {
    const url = await this.links.createLink(user, 'reset_password')
    await this.mail.send(
      resetPasswordTemplate({ to: user.email, displayName: user.displayName, url }),
    )
  }
}
