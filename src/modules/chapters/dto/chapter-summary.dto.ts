import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Một dòng mục lục */
export class ChapterSummaryDto {
  @ApiField({ example: 12 })
  number: number

  @ApiField({ example: 'Gặp lại' })
  title: string

  @ApiField({ format: 'date-time', description: 'Lần đầu xuất bản' })
  publishedAt: string
}
