import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { StoryDto } from '@/modules/stories/dto/story.dto'
import { ReadingProgressDto } from './reading-progress.dto'

/** Một dòng lịch sử đọc: truyện và chỗ đọc dở */
export class HistoryItemDto {
  @ApiField({ type: StoryDto })
  story: StoryDto

  @ApiField({ type: ReadingProgressDto })
  progress: ReadingProgressDto
}
