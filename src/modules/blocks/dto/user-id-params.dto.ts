import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

/** Tham số đường dẫn /users/:id/... */
export class UserIdParamsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string
}
