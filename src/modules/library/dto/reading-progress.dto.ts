import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Chỗ đọc dở của một truyện (giống ReadingProgress của web) */
export class ReadingProgressDto {
  @ApiField({ example: 'thanh-xuan-vuon-truong' })
  slug: string

  @ApiField({ example: 12 })
  chapter: number

  @ApiField({ example: 'Gặp lại' })
  chapterTitle: string

  @ApiField({ example: 0.42, description: 'Tỉ lệ đã cuộn trong chương, 0–1' })
  progress: number

  @ApiField({ format: 'date-time' })
  readAt: string
}
