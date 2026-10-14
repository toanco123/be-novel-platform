import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

/** Tham số đường dẫn /comments/:id */
export class CommentIdParamsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string
}
