import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, MaxLength } from 'class-validator'
import { CaptchaDto } from '@/common/captcha/captcha.dto'
import { NormalizeEmail } from '@/common/validation/decorators/transform.decorator'

export class LoginDto extends CaptchaDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string

  /** Không bắt tối thiểu 8: user chuyển từ Supabase có thể có mật khẩu ngắn hơn */
  @ApiProperty({ minLength: 1, maxLength: 128, example: 'matkhau123' })
  @IsString()
  @Length(1, 128)
  password: string
}
