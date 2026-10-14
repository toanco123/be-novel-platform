import { Global, Module } from '@nestjs/common'
import { CaptchaService } from './captcha.service'

/** CaptchaService dùng chung (CaptchaGuard của các route có @RequireCaptcha()) */
@Global()
@Module({ providers: [CaptchaService], exports: [CaptchaService] })
export class CaptchaModule {}
