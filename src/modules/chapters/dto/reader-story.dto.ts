import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { NextChapterDto } from '@/modules/stories/dto/next-chapter.dto'
import { StoryAuthorDto } from '@/modules/stories/dto/story-author.dto'

/** Thông tin truyện đi kèm mỗi chương ở trang đọc */
export class ReaderStoryDto {
  @ApiField({ example: 'thanh-xuan-vuon-truong' })
  slug: string

  @ApiField({ example: 'Thanh xuân vườn trường' })
  title: string

  @ApiField({ type: StoryAuthorDto })
  author: StoryAuthorDto

  @ApiField({ enum: ['ongoing', 'completed'] })
  status: 'ongoing' | 'completed'

  @ApiField({ description: 'Số chương đã xuất bản' })
  chapterCount: number

  @ApiField({ type: String, nullable: true, format: 'uri' })
  coverUrl: string | null

  @ApiField({
    enum: ['draft', 'published'],
    description: 'draft: chủ truyện đang xem trước (không lưu vào kho đọc offline)',
  })
  visibility: 'draft' | 'published'

  @ApiField({
    type: NextChapterDto,
    nullable: true,
    description: 'Chương hẹn giờ sớm nhất (cuối chương mới nhất báo "Chương N ra lúc …")',
  })
  nextChapter: NextChapterDto | null
}
