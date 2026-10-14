import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Người tạo thể loại */
export class GenreCreatorDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ example: 'Linh' })
  displayName: string
}
