import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'

/** Đăng ký: 5 lần / giờ / IP */
export const REGISTER_LIMIT: RateLimitOptions = { limit: 5, windowSeconds: 3600 }
/** Đăng nhập sai: 5 lần / 15 phút theo email */
export const LOGIN_FAILED_EMAIL_LIMIT: RateLimitOptions = { limit: 5, windowSeconds: 900 }
/** Đăng nhập sai: 20 lần / 15 phút theo IP */
export const LOGIN_FAILED_IP_LIMIT: RateLimitOptions = { limit: 20, windowSeconds: 900 }

/** Hai tab cùng refresh: token vừa bị thay trong khoảng này thì không coi là bị đánh cắp */
export const REUSE_GRACE_MS = 10_000

/** Link xác nhận email hết hạn sau 24 giờ, link đặt lại mật khẩu sau 1 giờ */
export const VERIFY_EMAIL_TTL_MS = 24 * 3600 * 1000
export const RESET_PASSWORD_TTL_MS = 3600 * 1000

/** Trang của web mở từ link trong email (gốc là APP_WEB_URL, token ở query `token`) */
export const VERIFY_EMAIL_PATH = '/auth/verify-email'
export const RESET_PASSWORD_PATH = '/auth/reset-password'

/** Gửi lại thư xác nhận: 3 lần / giờ / người */
export const RESEND_VERIFICATION_LIMIT: RateLimitOptions = { limit: 3, windowSeconds: 3600 }
/** Quên mật khẩu: 3 lần / giờ theo email, 10 lần / giờ theo IP */
export const FORGOT_PASSWORD_EMAIL_LIMIT: RateLimitOptions = { limit: 3, windowSeconds: 3600 }
export const FORGOT_PASSWORD_IP_LIMIT: RateLimitOptions = { limit: 10, windowSeconds: 3600 }
