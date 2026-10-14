import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import { CaptchaDto } from '@/common/captcha/captcha.dto'
import { IsNewPassword } from '@/common/validation/decorators/new-password.decorator'

export class ChangePasswordDto extends CaptchaDto {
  @ApiProperty({ minLength: 1, maxLength: 128, example: 'matkhau123' })
  @IsString()
  @Length(1, 128)
  currentPassword: string

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    example: 'matkhaumoi456',
    description: '8–72 ký tự, có ít nhất một chữ cái và một chữ số, khác mật khẩu hiện tại',
  })
  @IsNewPassword()
  newPassword: string
}
