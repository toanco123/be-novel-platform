import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'
import { MAX_CHAPTER_BATCH, MAX_CHAPTER_NUMBER } from '../chapters.constants'

/** Query tải nhiều chương liên tiếp */
export class ChapterContentsQueryDto {
  @ApiProperty({ minimum: 1, maximum: MAX_CHAPTER_NUMBER, description: 'Từ chương có số ≥ from' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  from: number

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_CHAPTER_BATCH, default: MAX_CHAPTER_BATCH })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_BATCH)
  count: number = MAX_CHAPTER_BATCH
}
