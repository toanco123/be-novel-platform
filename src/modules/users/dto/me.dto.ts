import { ApiProperty } from '@nestjs/swagger'
import type { Role } from '@/common/auth/auth.types'

/** Hồ sơ của chính mình (không bao giờ có password_hash) */
export class MeDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({ format: 'email', example: 'linh@example.com' })
  email: string

  @ApiProperty({ example: 'Linh' })
  displayName: string

  @ApiProperty({ type: String, nullable: true, example: null })
  avatarUrl: string | null

  @ApiProperty({ enum: ['user', 'admin'], example: 'user' })
  role: Role

  @ApiProperty({ description: 'false cho tới khi xác nhận email (phần 5)' })
  emailVerified: boolean

  @ApiProperty({ format: 'date-time' })
  createdAt: string
}
