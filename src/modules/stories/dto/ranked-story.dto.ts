import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { StoryDto } from './story.dto'

/** Một dòng bảng xếp hạng */
export class RankedStoryDto {
  @ApiField({
    example: 1520,
    description: 'Lượt đọc trong kỳ / điểm trung bình thật / số người theo dõi, theo tiêu chí',
  })
  value: number

  @ApiField({ type: StoryDto })
  story: StoryDto
}
