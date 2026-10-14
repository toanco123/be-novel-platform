// Phiên đăng nhập = một họ refresh token (family_id, cũng là `sid` của access token). Đăng nhập
// mở họ mới; refresh xoay vòng trong họ; dùng lại token cũ thì thu hồi cả họ.
import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { hashToken, randomToken } from '@/common/crypto/secure-token'
import { AppException } from '@/common/errors/app.exception'
import type { ClientMeta } from '@/common/http/http.types'
import { AppConfig } from '@/config/app-config.service'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import type { IssuedSession, RotateCheck, RotateResult } from '../auth.types'
import { refreshTokenState } from '../refresh-token-state'
import { SessionsRepository } from '../sessions.repository'

@Injectable()
export class SessionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly sessions: SessionsRepository,
    private readonly config: AppConfig,
  ) {}

  /** Mở phiên mới (đăng nhập, đăng ký) */
  async create(userId: string, meta: ClientMeta, ex: Executor = this.db): Promise<IssuedSession> {
    const ttlMs = this.config.get('REFRESH_TOKEN_TTL_DAYS') * 86_400_000
    const refreshToken = randomToken()
    const row = await this.sessions.insert(
      {
        userId,
        familyId: randomUUID(),
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlMs),
        ...meta,
      },
      ex,
    )
    return { userId, sessionId: row.familyId, refreshToken, expiresAt: row.expiresAt }
  }

  /**
   * Đổi refresh token lấy token mới cùng họ (hạn giữ nguyên hạn của họ). Token không có, hết hạn
   * hoặc đã đăng xuất → invalid_token; vừa bị thay (hai tab) → token_reused; bị thay từ lâu →
   * thu hồi cả họ rồi token_reused. `check` trả lỗi thì thu hồi cả họ và ném lỗi đó.
   */
  async rotate(
    refreshToken: string,
    meta: ClientMeta,
    check?: RotateCheck,
  ): Promise<IssuedSession> {
    const result = await this.db.transaction(async (tx): Promise<RotateResult> => {
      const row = await this.sessions.findByHashForUpdate(hashToken(refreshToken), tx)
      if (!row) return { error: new AppException('invalid_token') }
      const state = refreshTokenState(row)
      if (state === 'expired' || state === 'revoked')
        return { error: new AppException('invalid_token') }
      if (state === 'grace') return { error: new AppException('token_reused') }
      // Ghi việc thu hồi rồi mới báo lỗi: ném trong transaction sẽ rollback
      if (state === 'reused') {
        await this.sessions.revokeFamily(row.familyId, tx)
        return { error: new AppException('token_reused') }
      }
      const denied = await check?.(row.userId, tx)
      if (denied) {
        await this.sessions.revokeFamily(row.familyId, tx)
        return { error: denied }
      }
      const next = randomToken()
      const created = await this.sessions.insert(
        {
          userId: row.userId,
          familyId: row.familyId,
          tokenHash: hashToken(next),
          expiresAt: row.expiresAt,
          ...meta,
        },
        tx,
      )
      await this.sessions.markReplaced(row.id, created.id, tx)
      return {
        session: {
          userId: row.userId,
          sessionId: row.familyId,
          refreshToken: next,
          expiresAt: created.expiresAt,
        },
      }
    })
    if ('error' in result) throw result.error
    return result.session
  }

  /** Đăng xuất phiên của refresh token này; token không hợp lệ thì bỏ qua */
  async revokeByToken(refreshToken: string) {
    const row = await this.sessions.findByHash(hashToken(refreshToken))
    if (row) await this.sessions.revokeFamily(row.familyId)
  }

  revokeSession(sessionId: string) {
    return this.sessions.revokeFamily(sessionId)
  }

  /** Đăng xuất mọi thiết bị (cả khi khóa tài khoản, đổi mật khẩu ở phần sau) */
  revokeAllForUser(userId: string) {
    return this.sessions.revokeAllForUser(userId)
  }
}
