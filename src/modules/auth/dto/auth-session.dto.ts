import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MeDto } from '@/modules/users/dto/me.dto'

/** Phiên đăng nhập trả cho client (register, login, refresh) */
export class AuthSessionDto {
  @ApiProperty({ type: MeDto })
  user!: MeDto

  @ApiProperty({
    description: 'JWT gửi kèm mọi request: Authorization: Bearer <accessToken>',
    example: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRldiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string

  @ApiProperty({ type: 'integer', description: 'Access token còn hiệu lực (giây)', example: 900 })
  expiresIn!: number

  @ApiPropertyOptional({
    description: 'Chỉ có khi gửi header X-Client: mobile; web nhận trong cookie HttpOnly',
  })
  refreshToken?: string
}
