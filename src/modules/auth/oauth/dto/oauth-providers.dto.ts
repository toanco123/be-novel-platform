import { ApiField } from '@/common/response/api-field.decorator'
import type { OAuthProvider } from '@/infra/database/schema'

/** Provider đăng nhập mạng xã hội đang bật */
export class OAuthProvidersDto {
  @ApiField({
    enum: ['google', 'facebook', 'apple'],
    isArray: true,
    example: ['google', 'facebook'],
  })
  providers: OAuthProvider[]
}
