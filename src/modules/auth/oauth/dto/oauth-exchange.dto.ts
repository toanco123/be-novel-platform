import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length, Matches } from 'class-validator'
import { CODE_CHALLENGE_PATTERN } from '../pkce'

export class OAuthExchangeDto {
  @ApiProperty({
    description: 'Mã `code` trong redirect_to sau khi đăng nhập (dùng một lần, 60 giây)',
  })
  @IsString()
  @Length(1, 256)
  code: string

  @ApiProperty({
    description: 'PKCE: chuỗi bí mật client tạo trước khi gọi authorize (43–128 ký tự)',
  })
  @Matches(CODE_CHALLENGE_PATTERN, { message: 'codeVerifier must be 43–128 base64url characters' })
  codeVerifier: string
}
