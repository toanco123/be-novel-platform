import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'

/** Nhập sai mật khẩu hiện tại (đổi mật khẩu, xóa tài khoản): 5 lần / 15 phút / người */
export const WRONG_PASSWORD_LIMIT: RateLimitOptions = { limit: 5, windowSeconds: 900 }
