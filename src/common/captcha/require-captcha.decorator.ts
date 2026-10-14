import { applyDecorators, UseGuards } from '@nestjs/common'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { CaptchaGuard } from './captcha.guard'

/** Route cần captcha Turnstile (form đăng ký, đăng nhập...); body kế thừa CaptchaDto */
export const RequireCaptcha = () =>
  applyDecorators(UseGuards(CaptchaGuard), ApiErrorResponses('invalid_captcha'))
