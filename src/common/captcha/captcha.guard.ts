import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { CaptchaService } from './captcha.service'
import type { CaptchaRequest } from './captcha.types'

/** @RequireCaptcha(): kiểm tra `captchaToken` (hoặc `captcha_token`) trong body trước khi vào route */
@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private readonly captcha: CaptchaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<CaptchaRequest>()
    const token = req.body?.captchaToken ?? req.body?.captcha_token
    await this.captcha.verify(token, req.ip ?? null)
    return true
  }
}
