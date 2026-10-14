import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength } from 'class-validator'
import { CODE_CHALLENGE_PATTERN } from '../pkce'

/** Query của GET /v1/auth/oauth/:provider/authorize (nhận cả `redirect_to`, `code_challenge`) */
export class OAuthAuthorizeQueryDto {
  @ApiProperty({
    description:
      'Nơi quay về sau khi đăng nhập: trang của web (APP_WEB_URL) hoặc deep link của app đã khai báo ' +
      '(OAUTH_REDIRECT_URLS). Nhận về `?code=` (đổi ở /v1/auth/oauth/exchange) hoặc `?error=`',
    example: 'http://localhost:3000/auth/callback',
  })
  @IsString()
  @MaxLength(2048)
  redirectTo: string

  @ApiProperty({
    description: 'PKCE: SHA-256 (base64url) của codeVerifier client giữ bí mật',
    example: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  })
  @Matches(CODE_CHALLENGE_PATTERN, { message: 'codeChallenge must be 43–128 base64url characters' })
  codeChallenge: string
}
