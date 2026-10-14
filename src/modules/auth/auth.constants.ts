import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'

/** Đăng ký: 5 lần / giờ / IP */
export const REGISTER_LIMIT: RateLimitOptions = { limit: 5, windowSeconds: 3600 }
/** Đăng nhập sai: 5 lần / 15 phút theo email */
export const LOGIN_FAILED_EMAIL_LIMIT: RateLimitOptions = { limit: 5, windowSeconds: 900 }
/** Đăng nhập sai: 20 lần / 15 phút theo IP */
export const LOGIN_FAILED_IP_LIMIT: RateLimitOptions = { limit: 20, windowSeconds: 900 }

/** Hai tab cùng refresh: token vừa bị thay trong khoảng này thì không coi là bị đánh cắp */
export const REUSE_GRACE_MS = 10_000

/** Cookie refresh token của web: chỉ gửi kèm các request /v1/auth/* */
export const REFRESH_COOKIE = 'refresh_token'
export const REFRESH_COOKIE_PATH = '/v1/auth'
