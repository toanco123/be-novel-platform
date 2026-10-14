import type { Request } from 'express'

/** Kết quả của siteverify (phần cần dùng) */
export type TurnstileResult = { success: boolean; 'error-codes'?: string[] }

/** Request có body chứa token captcha (camelCase hoặc snake_case) */
export type CaptchaRequest = Request & {
  body?: { captchaToken?: unknown; captcha_token?: unknown }
}
