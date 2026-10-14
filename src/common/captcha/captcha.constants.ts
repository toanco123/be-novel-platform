/** API kiểm tra token của Cloudflare Turnstile */
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
/** Cloudflare phải trả lời trong khoảng này */
export const CAPTCHA_TIMEOUT_MS = 5000
/** Token Turnstile dài tối đa 2048 ký tự */
export const CAPTCHA_TOKEN_MAX_LENGTH = 2048
