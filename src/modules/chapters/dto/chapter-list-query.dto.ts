import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
import { PageQueryDto } from '@/common/pagination/page-query.dto'
import { MAX_CHAPTER_NUMBER } from '../chapters.constants'
import type { ChapterOrder } from '../chapters.types'

/** Query mục lục: phân trang, thứ tự, chỉ lấy từ chương `from` */
export class ChapterListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc', description: 'Theo số chương' })
  @IsIn(['asc', 'desc'])
  order: ChapterOrder = 'asc'

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_CHAPTER_NUMBER,
    description: 'Chỉ chương có số ≥ from. `?from=N&pageSize=1` → meta.total là số chương từ N',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  from?: number
}
