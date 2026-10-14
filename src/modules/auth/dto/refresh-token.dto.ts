import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Length } from 'class-validator'

/** Body của /refresh và /logout: mobile gửi token ở đây, web để trống (dùng cookie) */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    maxLength: 256,
    description: 'Chỉ mobile gửi; web để trống, token nằm trong cookie refresh_token',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  refreshToken?: string
}
