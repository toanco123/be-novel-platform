import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator'
import { Trim } from '@/common/validation/decorators/transform.decorator'
import { MAX_CHAPTER_NUMBER } from '@/modules/chapters/chapters.constants'
import { MAX_COMMENT_LENGTH } from '../comments.constants'

/** Viết bình luận (hoặc trả lời) */
export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: MAX_COMMENT_LENGTH, example: 'Chương này hay quá!' })
  @Trim()
  @IsString()
  @Length(1, MAX_COMMENT_LENGTH)
  content: string

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_CHAPTER_NUMBER,
    description: 'Bình luận của chương này; bỏ trống: bình luận của cả truyện',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  chapter?: number

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Trả lời bình luận gốc này (cùng truyện, cùng chương; chỉ một cấp)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string
}
