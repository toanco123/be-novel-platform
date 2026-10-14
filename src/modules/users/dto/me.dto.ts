import type { Role } from '@/common/auth/auth.types'
import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Hồ sơ của chính mình (không bao giờ có password_hash) */
export class MeDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ format: 'email', example: 'linh@example.com' })
  email: string

  @ApiField({ example: 'Linh' })
  displayName: string

  @ApiField({ type: String, nullable: true, example: null })
  avatarUrl: string | null

  @ApiField({ enum: ['user', 'admin'], example: 'user' })
  role: Role

  @ApiField({ description: 'false cho tới khi xác nhận email (phần 5)' })
  emailVerified: boolean

  @ApiField({ format: 'date-time' })
  createdAt: string
}
