import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator'
import { CaptchaDto } from '@/common/captcha/captcha.dto'
import { NormalizeEmail } from '@/common/validation/decorators/transform.decorator'

/** Xác nhận xóa tài khoản: có mật khẩu thì gửi `password`, tài khoản chỉ dùng Google / Facebook gửi `confirmEmail` */
export class DeleteAccountDto extends CaptchaDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 128, example: 'matkhau123' })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  password?: string

  @ApiPropertyOptional({
    format: 'email',
    maxLength: 254,
    description: 'Gõ lại email của tài khoản (tài khoản không có mật khẩu)',
  })
  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  confirmEmail?: string
}
