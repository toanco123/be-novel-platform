import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { ResponseMetaDto } from '@/common/response/response-meta.dto'

/** `meta` của response danh sách (Swagger) */
export class PageMetaDto extends ResponseMetaDto {
  @ApiField({ type: 'integer', description: 'Tổng số dòng', example: 42 })
  total: number

  @ApiField({ type: 'integer', example: 1 })
  page: number

  @ApiField({ type: 'integer', example: 20 })
  pageSize: number

  @ApiField({ type: 'integer', description: 'Số trang; 0 khi không có dòng nào', example: 3 })
  pageCount: number
}
