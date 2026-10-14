import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Số truyện đang theo dõi có chương mới (chấm đỏ ở header) */
export class UpdateCountDto {
  @ApiField({ example: 3 })
  count: number
}
