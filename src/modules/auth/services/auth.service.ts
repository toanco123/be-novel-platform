// Đăng ký, đăng nhập, refresh, đăng xuất. Trả access token kèm refresh token; controller quyết
// định refresh token đi qua cookie (web) hay body (mobile).
import { Inject, Injectable } from '@nestjs/common'
import { TokenService } from '@/common/auth/token.service'
import { PasswordService } from '@/common/crypto/password.service'
import { AppException } from '@/common/errors/app.exception'
import type { ClientMeta } from '@/common/http/http.types'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { toMe } from '@/modules/users/user.mapper'
import { accountBanned, isBanned } from '@/modules/users/user.rules'
import { UsersRepository } from '@/modules/users/users.repository'
import { LOGIN_FAILED_EMAIL_LIMIT, LOGIN_FAILED_IP_LIMIT, REGISTER_LIMIT } from '../auth.constants'
import type { AuthResult, IssuedSession } from '../auth.types'
import type { LoginDto } from '../dto/login.dto'
import type { RegisterDto } from '../dto/register.dto'
import { EmailVerificationService } from './email-verification.service'
import { SessionService } from './session.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly rateLimit: RateLimitService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  /**
   * Tạo tài khoản + hồ sơ, đăng nhập luôn và gửi thư xác nhận email. Email trùng (không phân biệt hoa
   * thường) → email_taken
   */
  async register(input: RegisterDto, meta: ClientMeta): Promise<AuthResult> {
    await this.rateLimit.consume(`auth:register:ip:${meta.ip ?? 'unknown'}`, REGISTER_LIMIT)
    const passwordHash = await this.passwords.hash(input.password)
    const { user, session } = await this.db.transaction(async (tx) => {
      const created = await this.users.createWithProfile(
        { email: input.email, passwordHash, displayName: input.displayName },
        tx,
      )
      return { user: created, session: await this.sessions.create(created.id, meta, tx) }
    })
    await this.emailVerification.sendAfterRegister({
      id: user.id,
      email: user.email,
      displayName: input.displayName,
    })
    return this.issue(session)
  }

  /**
   * Sai email hay mật khẩu đều là invalid_credentials (không lộ email có tồn tại). Hết lượt sai
   * thì rate_limited, kể cả khi lần này đúng mật khẩu.
   */
  async login(input: LoginDto, meta: ClientMeta): Promise<AuthResult> {
    const emailKey = `auth:login-failed:email:${input.email}`
    const ipKey = `auth:login-failed:ip:${meta.ip ?? 'unknown'}`
    for (const [key, limit] of [
      [emailKey, LOGIN_FAILED_EMAIL_LIMIT],
      [ipKey, LOGIN_FAILED_IP_LIMIT],
    ] as const) {
      const { allowed, retryAfterSeconds } = await this.rateLimit.peek(key, limit)
      if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    }

    const user = await this.users.findByEmail(input.email)
    const check = user?.passwordHash
      ? await this.passwords.verify(input.password, user.passwordHash)
      : await this.passwords.verifyDummy(input.password)
    if (!user || !check.ok) {
      await Promise.all([
        this.rateLimit.consume(emailKey, LOGIN_FAILED_EMAIL_LIMIT),
        this.rateLimit.consume(ipKey, LOGIN_FAILED_IP_LIMIT),
      ])
      throw new AppException('invalid_credentials')
    }
    await this.rateLimit.reset(emailKey)
    // Chỉ báo bị khóa khi đã đúng mật khẩu
    if (isBanned(user)) throw accountBanned(user.bannedUntil!)

    const newHash = check.needsRehash ? await this.passwords.hash(input.password) : null
    const session = await this.db.transaction(async (tx) => {
      // Hash bcrypt cũ (Supabase) → argon2id
      if (newHash) await this.users.updatePasswordHash(user.id, newHash, tx)
      await this.users.markSignedIn(user.id, tx)
      return this.sessions.create(user.id, meta, tx)
    })
    return this.issue(session)
  }

  /** Xoay vòng refresh token; tài khoản bị khóa thì thu hồi phiên và trả account_banned */
  async refresh(refreshToken: string, meta: ClientMeta): Promise<AuthResult> {
    const session = await this.sessions.rotate(refreshToken, meta, async (userId, tx) => {
      const user = await this.users.findById(userId, tx)
      if (!user) return new AppException('invalid_token')
      return isBanned(user) ? accountBanned(user.bannedUntil!) : null
    })
    return this.issue(session)
  }

  logout(refreshToken: string) {
    return this.sessions.revokeByToken(refreshToken)
  }

  logoutAll(userId: string) {
    return this.sessions.revokeAllForUser(userId)
  }

  /** Mở phiên cho người dùng đã xác định danh tính (đăng nhập mạng xã hội); bị khóa → account_banned */
  async signIn(userId: string, meta: ClientMeta): Promise<AuthResult> {
    const session = await this.db.transaction(async (tx) => {
      await this.users.markSignedIn(userId, tx)
      return this.sessions.create(userId, meta, tx)
    })
    return this.issue(session)
  }

  /** Ký access token cho phiên (vai trò lấy mới từ DB) */
  private async issue(session: IssuedSession): Promise<AuthResult> {
    const user = await this.users.findWithProfile(session.userId)
    if (!user) throw new AppException('invalid_token')
    if (isBanned(user)) {
      await this.sessions.revokeSession(session.sessionId)
      throw accountBanned(user.bannedUntil!)
    }
    const accessToken = await this.tokens.signAccessToken({
      id: user.id,
      role: user.role,
      sessionId: session.sessionId,
      emailVerified: user.emailVerifiedAt !== null,
    })
    return {
      user: toMe(user),
      accessToken,
      expiresIn: this.tokens.accessTokenTtl,
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.expiresAt,
    }
  }
}
