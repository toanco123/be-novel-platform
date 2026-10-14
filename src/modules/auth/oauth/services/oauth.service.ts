// Đăng nhập mạng xã hội: luồng chuyển trang (Google, Facebook; web và app) với PKCE giữa client và
// BE, id token của Apple (app), tìm / liên kết / tạo tài khoản. Phiên đăng nhập do AuthService mở.
import { Inject, Injectable } from '@nestjs/common'
import { randomToken } from '@/common/crypto/secure-token'
import { AppException } from '@/common/errors/app.exception'
import { ErrorLogger } from '@/common/errors/error-logger.service'
import { AppConfig } from '@/config/app-config.service'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import type { OAuthProvider } from '@/infra/database/schema'
import { accountBanned, isBanned } from '@/modules/users/user.rules'
import { UsersRepository } from '@/modules/users/users.repository'
import { SessionService } from '../../services/session.service'
import { OAuthAccountsRepository } from '../oauth-accounts.repository'
import { oauthAvatarUrl, oauthDisplayName } from '../oauth-profile'
import { OAUTH_FALLBACK_PATH, OAUTH_REDIRECT_ERRORS } from '../oauth.constants'
import type { OAuthProfile, OAuthRedirectClient, RedirectProvider } from '../oauth.types'
import { codeChallengeOf, matchesCodeChallenge, newCodeVerifier } from '../pkce'
import { AppleOAuthClient } from '../providers/apple-oauth.client'
import { FacebookOAuthClient } from '../providers/facebook-oauth.client'
import { GoogleOAuthClient } from '../providers/google-oauth.client'
import { isAllowedRedirect } from '../redirect-allowlist'
import { OAuthStoreService } from './oauth-store.service'

@Injectable()
export class OAuthService {
  private readonly redirectClients: Record<RedirectProvider, OAuthRedirectClient>

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UsersRepository,
    private readonly accounts: OAuthAccountsRepository,
    private readonly sessions: SessionService,
    private readonly store: OAuthStoreService,
    private readonly config: AppConfig,
    private readonly errors: ErrorLogger,
    google: GoogleOAuthClient,
    facebook: FacebookOAuthClient,
    private readonly apple: AppleOAuthClient,
  ) {
    this.redirectClients = { google, facebook }
  }

  /** Provider đang bật (client chỉ hiện nút tương ứng) */
  enabledProviders(): OAuthProvider[] {
    return [...Object.values(this.redirectClients), this.apple]
      .filter((client) => client.enabled)
      .map((client) => client.provider)
  }

  /** Bước 1: kiểm tra redirect_to, lưu state, trả URL trang đăng nhập của provider */
  async start(provider: string, redirectTo: string, clientCodeChallenge: string) {
    const client = this.redirectClient(provider)
    if (!isAllowedRedirect(redirectTo, this.allowedRedirects())) {
      throw new AppException('oauth_failed', { reason: 'redirect_to_not_allowed' })
    }
    const state = randomToken()
    // Google nhận PKCE: BE giữ verifier tới bước callback
    const providerCodeVerifier = client.provider === 'google' ? newCodeVerifier() : undefined
    await this.store.saveState(state, {
      provider: client.provider,
      redirectTo,
      clientCodeChallenge,
      providerCodeVerifier,
    })
    return client.authorizeUrl({
      state,
      redirectUri: this.callbackUrl(client.provider),
      codeChallenge: providerCodeVerifier && codeChallengeOf(providerCodeVerifier),
    })
  }

  /**
   * Bước 2 (provider quay về): đổi code lấy hồ sơ, tìm / tạo tài khoản, trả URL về client kèm mã
   * một lần `?code=`, hoặc `?error=<mã lỗi>`. Không có state hợp lệ thì về trang báo lỗi của web.
   */
  async finish(provider: string, query: { code?: string; state?: string; error?: string }) {
    const state = query.state ? await this.store.takeState(query.state) : null
    if (!state || state.provider !== provider) return this.fallbackUrl()
    try {
      if (query.error || !query.code) throw new AppException('oauth_failed')
      const profile = await this.redirectClients[state.provider].exchangeCode({
        code: query.code,
        redirectUri: this.callbackUrl(state.provider),
        codeVerifier: state.providerCodeVerifier,
      })
      const userId = await this.resolveUser(profile)
      const code = randomToken()
      await this.store.saveCode(code, { userId, clientCodeChallenge: state.clientCodeChallenge })
      return withParam(state.redirectTo, 'code', code)
    } catch (error) {
      return withParam(state.redirectTo, 'error', this.redirectErrorCode(error))
    }
  }

  /** Bước 3: client đổi mã một lần (kèm codeVerifier) lấy phiên; trả id người dùng */
  async exchange(code: string, codeVerifier: string) {
    const grant = await this.store.takeCode(code)
    if (!grant || !matchesCodeChallenge(codeVerifier, grant.clientCodeChallenge)) {
      throw new AppException('oauth_failed')
    }
    return grant.userId
  }

  /** Apple (app): xác minh id token, tìm / tạo tài khoản; trả id người dùng */
  async signInWithApple(idToken: string, nonce: string, displayName?: string) {
    if (!this.apple.enabled) throw new AppException('provider_disabled')
    const profile = await this.apple.verifyIdToken(idToken, nonce)
    return this.resolveUser({ ...profile, name: displayName ?? null })
  }

  /**
   * Tài khoản cho hồ sơ provider:
   * 1. đã liên kết → tài khoản đó;
   * 2. provider đã xác minh email và có tài khoản cùng email → liên kết. Tài khoản đó chưa xác nhận
   *    email thì người đăng ký trước chưa chứng minh có hộp thư: bỏ mật khẩu, thu hồi phiên;
   * 3. chưa có → tạo tài khoản không mật khẩu (tên, ảnh như handle_new_user của Supabase).
   * Bị khóa → account_banned; provider không có email → oauth_email_required
   */
  private async resolveUser(profile: OAuthProfile) {
    return this.db.transaction(async (tx) => {
      const linked = await this.accounts.find(profile.provider, profile.providerUserId, tx)
      let userId = linked?.userId
      if (userId) {
        await this.accounts.markSignedIn(profile.provider, profile.providerUserId, tx)
      } else {
        if (!profile.email) throw new AppException('oauth_email_required')
        const existing = await this.users.findByEmail(profile.email, tx)
        if (existing) {
          // Email chưa được provider xác minh thì không gộp vào tài khoản của người khác
          if (!profile.emailVerified) throw new AppException('email_taken')
          userId = existing.id
          if (!existing.emailVerifiedAt) {
            await this.users.updatePasswordHash(existing.id, null, tx)
            await this.users.markEmailVerified(existing.id, tx)
            await this.sessions.revokeAllForUser(existing.id, tx)
          }
        } else {
          const created = await this.users.createWithProfile(
            {
              email: profile.email,
              passwordHash: null,
              displayName: oauthDisplayName(profile),
              avatarUrl: oauthAvatarUrl(profile),
              emailVerified: profile.emailVerified,
            },
            tx,
          )
          userId = created.id
        }
        await this.accounts.insert(
          {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            userId,
            email: profile.email,
          },
          tx,
        )
      }
      const user = await this.users.findById(userId, tx)
      if (!user) throw new AppException('oauth_failed')
      if (isBanned(user)) throw accountBanned(user.bannedUntil!)
      return user.id
    })
  }

  private redirectClient(provider: string) {
    const client = this.redirectClients[provider as RedirectProvider] as
      OAuthRedirectClient | undefined
    if (!client?.enabled) throw new AppException('provider_disabled')
    return client
  }

  /** Lỗi đã biết báo đúng mã cho client; lỗi lạ ghi log, báo chung oauth_failed */
  private redirectErrorCode(error: unknown) {
    if (error instanceof AppException) {
      return OAUTH_REDIRECT_ERRORS.includes(error.code) ? error.code : 'oauth_failed'
    }
    this.errors.log(error, { action: 'oauth_callback' })
    return 'oauth_failed'
  }

  private allowedRedirects() {
    return [this.config.get('APP_WEB_URL'), ...this.config.get('OAUTH_REDIRECT_URLS')]
  }

  private callbackUrl(provider: RedirectProvider) {
    return new URL(
      `/v1/auth/oauth/${provider}/callback`,
      this.config.get('API_PUBLIC_URL'),
    ).toString()
  }

  private fallbackUrl() {
    return withParam(
      new URL(OAUTH_FALLBACK_PATH, this.config.get('APP_WEB_URL')).toString(),
      'error',
      'oauth_failed',
    )
  }
}

/** Thêm tham số vào URL (giữ các tham số sẵn có; dùng được cả deep link của app) */
function withParam(target: string, key: string, value: string) {
  const url = new URL(target)
  url.searchParams.set(key, value)
  return url.toString()
}
