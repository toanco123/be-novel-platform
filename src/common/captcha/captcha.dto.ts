import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { CAPTCHA_TOKEN_MAX_LENGTH } from './captcha.constants'

/** Body của route có @RequireCaptcha() kế thừa class này */
export class CaptchaDto {
  @ApiPropertyOptional({
    maxLength: CAPTCHA_TOKEN_MAX_LENGTH,
    description: 'Token Cloudflare Turnstile; bắt buộc khi server bật captcha (TURNSTILE_SECRET)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CAPTCHA_TOKEN_MAX_LENGTH)
  captchaToken?: string
}
