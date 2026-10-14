import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { MAX_CHAPTER_NUMBER } from '@/modules/chapters/chapters.constants'
import { MAX_INPUT_TITLE_LENGTH } from '../library.constants'

/** Một dòng lịch sử lúc còn là khách (giống ReadingProgress của web) */
export class MergeHistoryEntryDto {
  @ApiProperty({ example: 'thanh-xuan-vuon-truong' })
  @IsString()
  @MaxLength(200)
  slug: string

  @ApiProperty({ minimum: 1, maximum: MAX_CHAPTER_NUMBER })
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  chapter: number

  @ApiPropertyOptional({ maxLength: MAX_INPUT_TITLE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_INPUT_TITLE_LENGTH)
  chapterTitle?: string

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1)
  progress?: number

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Sau hiện tại hoặc bỏ trống: coi là bây giờ',
  })
  @IsOptional()
  @IsDateString()
  readAt?: string
}
