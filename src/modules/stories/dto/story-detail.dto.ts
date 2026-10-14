import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { StoryDto } from './story.dto'

/** Trang chi tiết truyện: thẻ truyện với mô tả đầy đủ, thêm số liệu */
export class StoryDetailDto extends StoryDto {
  @ApiField()
  followerCount: number

  @ApiField({
    type: [Number],
    example: [0, 1, 2, 5, 12],
    description: 'Số lượt chấm 1..5 sao',
  })
  ratingCounts: number[]
}
