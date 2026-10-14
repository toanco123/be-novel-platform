import { ApiField, ApiFieldOptional } from '@/common/response/api-field.decorator'
import { MeDto } from '@/modules/users/dto/me.dto'

/** Phiên đăng nhập trả cho client (register, login, refresh) */
export class AuthSessionDto {
  @ApiField({ type: MeDto })
  user: MeDto

  @ApiField({
    description: 'JWT gửi kèm mọi request: Authorization: Bearer <accessToken>',
    example: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRldiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string

  @ApiField({ type: 'integer', description: 'Access token còn hiệu lực (giây)', example: 900 })
  expiresIn: number

  @ApiFieldOptional({
    description: 'Chỉ có khi gửi header X-Client: mobile; web nhận trong cookie HttpOnly',
  })
  refreshToken?: string
}
