import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, MaxLength } from 'class-validator'
import { CaptchaDto } from '@/common/captcha/captcha.dto'
import { NormalizeEmail } from '@/common/validation/decorators/transform.decorator'

export class ForgotPasswordDto extends CaptchaDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string
}
