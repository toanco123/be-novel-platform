// Link trong email (xác nhận email, đặt lại mật khẩu): tạo token, dựng URL về trang của web, kiểm tra
// khi người dùng bấm link. Client giữ token gốc trong link, DB chỉ lưu SHA-256.
import { Inject, Injectable } from '@nestjs/common'
import { hashToken, randomToken } from '@/common/crypto/secure-token'
import { AppException } from '@/common/errors/app.exception'
import { AppConfig } from '@/config/app-config.service'
import { DB } from '@/infra/database/database.constants'
import type { Db, Tx } from '@/infra/database/database.types'
import type { EmailTokenPurpose } from '@/infra/database/schema'
import {
  RESET_PASSWORD_PATH,
  RESET_PASSWORD_TTL_MS,
  VERIFY_EMAIL_PATH,
  VERIFY_EMAIL_TTL_MS,
} from '../auth.constants'
import { EmailTokensRepository } from '../repositories/email-tokens.repository'

const LINKS: Record<EmailTokenPurpose, { path: string; ttlMs: number }> = {
  verify_email: { path: VERIFY_EMAIL_PATH, ttlMs: VERIFY_EMAIL_TTL_MS },
  reset_password: { path: RESET_PASSWORD_PATH, ttlMs: RESET_PASSWORD_TTL_MS },
}

@Injectable()
export class EmailTokenService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly tokens: EmailTokensRepository,
    private readonly config: AppConfig,
  ) {}

  /** Tạo link mới; link cũ chưa dùng cùng mục đích hết hiệu lực. Trả URL đầy đủ về web */
  async createLink(user: { id: string; email: string }, purpose: EmailTokenPurpose) {
    const { path, ttlMs } = LINKS[purpose]
    const token = randomToken()
    await this.db.transaction(async (tx) => {
      await this.tokens.invalidateUnused(user.id, purpose, tx)
      await this.tokens.insert(
        {
          userId: user.id,
          purpose,
          email: user.email,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + ttlMs),
        },
        tx,
      )
    })
    const url = new URL(path, this.config.get('APP_WEB_URL'))
    url.searchParams.set('token', token)
    return url.toString()
  }

  /**
   * Dùng link (trong transaction của thao tác đi kèm). Token sai, hết hạn, đã dùng, hoặc email của
   * tài khoản đã đổi → 400 invalid_link. Trả id người dùng
   */
  async consume(token: string, purpose: EmailTokenPurpose, tx: Tx) {
    const row = await this.tokens.findForUpdate(hashToken(token), purpose, tx)
    const usable =
      row !== null &&
      row.usedAt === null &&
      row.expiresAt.getTime() > Date.now() &&
      row.email.toLowerCase() === row.userEmail.toLowerCase()
    if (!usable) throw new AppException('invalid_link')
    // Link này và mọi link khác chưa dùng cùng mục đích hết hiệu lực
    await this.tokens.invalidateUnused(row.userId, purpose, tx)
    return row.userId
  }
}
