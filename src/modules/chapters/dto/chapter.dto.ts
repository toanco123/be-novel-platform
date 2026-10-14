import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { ChapterRefDto } from '@/modules/stories/dto/chapter-ref.dto'
import { ReaderStoryDto } from './reader-story.dto'

/** Một chương cho trang đọc: nội dung, thông tin truyện, chương trước / sau (giống ChapterContent của web) */
export class ChapterDto {
  @ApiField({ type: ReaderStoryDto })
  story: ReaderStoryDto

  @ApiField({ example: 12 })
  number: number

  @ApiField({ example: 'Gặp lại' })
  title: string

  @ApiField({
    description:
      'HTML rút gọn của trình soạn hoặc văn bản thuần kiểu cũ; client đọc qua parseContent, không render thẳng',
  })
  content: string

  @ApiField({ format: 'date-time', description: 'Lần đầu xuất bản' })
  publishedAt: string

  @ApiField({
    type: ChapterRefDto,
    nullable: true,
    description: 'Chương đã xuất bản liền trước (số chương có thể không liền nhau)',
  })
  prev: ChapterRefDto | null

  @ApiField({ type: ChapterRefDto, nullable: true, description: 'Chương đã xuất bản liền sau' })
  next: ChapterRefDto | null
}
