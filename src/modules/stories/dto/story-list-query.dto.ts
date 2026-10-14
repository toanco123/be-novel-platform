import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, Matches } from 'class-validator'
import { PageQueryDto } from '@/common/pagination/page-query.dto'
import {
  AUTHOR_SLUG_PATTERN,
  GENRE_SLUG_PATTERN,
  STORY_LENGTHS,
  STORY_SORTS,
  STORY_STATUSES,
} from '../stories.constants'
import type { StoryLength, StorySort } from '../stories.types'

/** Query danh sách truyện công khai: lọc, sắp xếp, phân trang */
export class StoryListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: STORY_STATUSES })
  @IsOptional()
  @IsIn(STORY_STATUSES)
  status?: 'ongoing' | 'completed'

  @ApiPropertyOptional({ example: 'ngon-tinh', description: 'Slug thể loại' })
  @IsOptional()
  @Matches(GENRE_SLUG_PATTERN)
  genre?: string

  @ApiPropertyOptional({
    enum: STORY_LENGTHS,
    description: 'Số chương đã xuất bản: short < 50, medium 50–200, long > 200',
  })
  @IsOptional()
  @IsIn(STORY_LENGTHS)
  length?: StoryLength

  @ApiPropertyOptional({
    example: 'tac-gia-6f1c2d4e-0b7a-4c1e-9a55-2f3e8d9b1a20',
    description: '`author.slug` của truyện: cùng chủ truyện và cùng bút danh',
  })
  @IsOptional()
  @Matches(AUTHOR_SLUG_PATTERN)
  author?: string

  @ApiPropertyOptional({
    enum: STORY_SORTS,
    default: 'updated',
    description:
      'Giảm dần. updated: mới cập nhật; views: lượt đọc (rồi mới cập nhật); rating: điểm, lượt chấm ' +
      '(rồi mới đăng); newest: mới đăng',
  })
  @IsIn(STORY_SORTS)
  sort: StorySort = 'updated'
}
