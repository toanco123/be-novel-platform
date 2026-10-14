import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Length } from 'class-validator'
import { Trim } from '@/common/validation/decorators/transform.decorator'

export class AppleSignInDto {
  @ApiProperty({ description: 'identityToken từ AppleAuthentication.signInAsync' })
  @IsString()
  @Length(1, 4096)
  idToken: string

  @ApiProperty({ description: 'Nonce gốc; app gửi SHA-256 (hex) của nó cho Apple' })
  @IsString()
  @Length(1, 256)
  nonce: string

  @ApiPropertyOptional({
    description: 'Họ tên Apple gửi ở lần cho phép đầu tiên; dùng cho tài khoản mới tạo',
    maxLength: 30,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 30)
  displayName?: string
}
