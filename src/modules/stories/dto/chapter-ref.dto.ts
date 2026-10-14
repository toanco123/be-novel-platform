import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Số và tên một chương */
export class ChapterRefDto {
  @ApiField({ example: 12 })
  number: number

  @ApiField({ example: 'Gặp lại' })
  title: string
}
