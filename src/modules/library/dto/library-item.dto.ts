import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { StoryDto } from '@/modules/stories/dto/story.dto'
import { ReadingProgressDto } from './reading-progress.dto'

/** Một truyện trong tủ truyện (giống LibraryItem của web, thêm mốc "đã thấy") */
export class LibraryItemDto {
  @ApiField({ type: StoryDto })
  story: StoryDto

  @ApiField({ format: 'date-time' })
  followedAt: string

  @ApiField({ example: 12, description: 'Chương mới nhất người dùng đã thấy / đọc tới' })
  seenChapter: number

  @ApiField({ example: 2, description: 'Số chương đã xuất bản sau mốc "đã thấy"' })
  newChapters: number

  @ApiField({ type: ReadingProgressDto, nullable: true, description: 'null: chưa đọc' })
  progress: ReadingProgressDto | null
}
