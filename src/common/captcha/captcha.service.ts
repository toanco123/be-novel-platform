// Kiểm tra captcha Cloudflare Turnstile ở server. Không đặt TURNSTILE_SECRET thì tắt (dev, test),
// giống web: client không có site key thì không gửi token.
import { Injectable } from '@nestjs/common'
import { AppException } from '@/common/errors/app.exception'
import { AppConfig } from '@/config/app-config.service'
import {
  CAPTCHA_TIMEOUT_MS,
  CAPTCHA_TOKEN_MAX_LENGTH,
  TURNSTILE_VERIFY_URL,
} from './captcha.constants'
import type { TurnstileResult } from './captcha.types'

@Injectable()
export class CaptchaService {
  constructor(private readonly config: AppConfig) {}

  /** Token sai hoặc thiếu → 400 invalid_captcha; Cloudflare không trả lời → 503 service_unavailable */
  async verify(token: unknown, ip: string | null) {
    const secret = this.config.get('TURNSTILE_SECRET')
    if (!secret) return
    if (typeof token !== 'string' || !token || token.length > CAPTCHA_TOKEN_MAX_LENGTH) {
      throw new AppException('invalid_captcha')
    }
    const body = new URLSearchParams({ secret, response: token })
    if (ip) body.set('remoteip', ip)
    let result: TurnstileResult
    try {
      const res = await fetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(CAPTCHA_TIMEOUT_MS),
      })
      result = (await res.json()) as TurnstileResult
    } catch (error) {
      // Lỗi của Cloudflare / mạng, không phải của người dùng: không cho qua nhưng báo đúng loại lỗi
      throw new AppException('service_unavailable', undefined, `Turnstile: ${String(error)}`)
    }
    if (!result.success) {
      throw new AppException('invalid_captcha', { reasons: result['error-codes'] ?? [] })
    }
  }
}
