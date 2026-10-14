import type { OAuthProvider } from '@/infra/database/schema'

/** Provider đăng nhập bằng luồng chuyển trang (web và app) */
export type RedirectProvider = Extract<OAuthProvider, 'google' | 'facebook'>

/** Hồ sơ chung lấy từ provider */
export type OAuthProfile = {
  provider: OAuthProvider
  /** `sub` / id của người dùng ở provider */
  providerUserId: string
  email: string | null
  /** Provider xác nhận email thuộc về người này */
  emailVerified: boolean
  name: string | null
  avatarUrl: string | null
}

/** Dựng URL trang đăng nhập của provider */
export type AuthorizeUrlInput = {
  state: string
  redirectUri: string
  /** PKCE giữa BE và provider (Google); Facebook không dùng */
  codeChallenge?: string
}

/** Đổi `code` provider trả về lấy hồ sơ */
export type ExchangeCodeInput = { code: string; redirectUri: string; codeVerifier?: string }

/** Provider có luồng chuyển trang (Google, Facebook) */
export type OAuthRedirectClient = {
  readonly provider: RedirectProvider
  readonly enabled: boolean
  authorizeUrl(input: AuthorizeUrlInput): string
  exchangeCode(input: ExchangeCodeInput): Promise<OAuthProfile>
}

/** state lưu trong Redis giữa bước `authorize` và `callback` */
export type OAuthState = {
  provider: RedirectProvider
  redirectTo: string
  /** PKCE của client (app / web) */
  clientCodeChallenge: string
  /** PKCE giữa BE và provider (Google) */
  providerCodeVerifier?: string
}

/** Mã một lần trả về client sau callback, đổi lấy phiên ở `/oauth/exchange` */
export type OAuthCodeGrant = { userId: string; clientCodeChallenge: string }

/** Kiểm tra id token (Google, Apple) */
export type IdTokenCheck = {
  issuer: string | string[]
  audience: string | string[]
  /** SHA-256 (hex) của nonce gốc client gửi; có thì claim `nonce` phải khớp */
  nonceHash?: string
}

/** Claim cần dùng của id token */
export type IdTokenClaims = {
  sub: string
  email?: string
  email_verified?: boolean | 'true' | 'false'
  name?: string
  picture?: string
  nonce?: string
}
