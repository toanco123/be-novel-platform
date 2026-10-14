import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import type { Role } from '@/core/auth/actor'
import { Trim } from '@/core/http/transforms'

/** Hồ sơ của chính mình (không bao giờ có password_hash) */
export class MeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'email', example: 'linh@example.com' })
  email!: string

  @ApiProperty({ example: 'Linh' })
  displayName!: string

  @ApiProperty({ type: String, nullable: true, example: null })
  avatarUrl!: string | null

  @ApiProperty({ enum: ['user', 'admin'], example: 'user' })
  role!: Role

  @ApiProperty({ description: 'false cho tới khi xác nhận email (phần 5)' })
  emailVerified!: boolean

  @ApiProperty({ format: 'date-time' })
  createdAt!: string
}

export class UpdateMeDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 50,
    example: 'Linh Nguyễn',
    description: 'Tên hiển thị, 2–50 ký tự sau khi bỏ khoảng trắng ở hai đầu',
  })
  @Trim()
  @IsString()
  @Length(2, 50)
  displayName!: string
}
