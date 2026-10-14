import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'
import { CURATED_LISTS } from '../stories.constants'
import type { CuratedList } from '../stories.types'

/** Query truyện chọn tay cho trang chủ */
export class CuratedStoriesQueryDto {
  @ApiProperty({ enum: CURATED_LISTS, description: 'featured: banner nổi bật; editor_pick: đề cử' })
  @IsIn(CURATED_LISTS)
  list: CuratedList
}
