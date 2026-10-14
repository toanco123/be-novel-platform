import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import { IsNewPassword } from '@/common/validation/decorators/new-password.decorator'

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token trong link đặt lại mật khẩu (query `token`)', maxLength: 256 })
  @IsString()
  @Length(1, 256)
  token: string

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    example: 'matkhaumoi456',
    description: 'Mật khẩu mới: 8–72 ký tự, có ít nhất một chữ cái và một chữ số',
  })
  @IsNewPassword()
  password: string
}
