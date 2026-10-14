import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
import { PageQueryDto } from '@/common/pagination/page-query.dto'
import { MAX_CHAPTER_NUMBER } from '@/modules/chapters/chapters.constants'
import { COMMENT_SORTS } from '../comments.constants'
import type { CommentSort } from '../comments.types'

/** Query bình luận gốc của truyện / chương */
export class CommentListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_CHAPTER_NUMBER,
    description: 'Số chương; bỏ trống: bình luận của cả truyện',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  chapter?: number

  @ApiPropertyOptional({
    enum: COMMENT_SORTS,
    default: 'newest',
    description: 'newest: mới nhất trước; top: nhiều lượt thích trước, rồi mới nhất',
  })
  @IsIn(COMMENT_SORTS)
  sort: CommentSort = 'newest'
}
