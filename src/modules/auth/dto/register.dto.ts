import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, MaxLength } from 'class-validator'
import { CaptchaDto } from '@/common/captcha/captcha.dto'
import { IsNewPassword } from '@/common/validation/decorators/new-password.decorator'
import { NormalizeEmail, Trim } from '@/common/validation/decorators/transform.decorator'

export class RegisterDto extends CaptchaDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    example: 'matkhau123',
    description: '8–72 ký tự, có ít nhất một chữ cái và một chữ số',
  })
  @IsNewPassword()
  password: string

  @ApiProperty({ minLength: 2, maxLength: 30, example: 'Linh' })
  @Trim()
  @IsString()
  @Length(2, 30)
  displayName: string
}
