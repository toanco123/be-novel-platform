import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { MAX_CHAPTER_NUMBER } from '@/modules/chapters/chapters.constants'
import { MAX_INPUT_TITLE_LENGTH } from '../library.constants'

/** Chỗ đang đọc: gửi khi mở chương (không có progress) và khi cuộn */
export class SaveProgressDto {
  @ApiProperty({ minimum: 1, maximum: MAX_CHAPTER_NUMBER, example: 12 })
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  chapter: number

  @ApiPropertyOptional({
    maxLength: MAX_INPUT_TITLE_LENGTH,
    example: 'Gặp lại',
    description: 'Lưu tối đa 120 ký tự',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_INPUT_TITLE_LENGTH)
  chapterTitle?: string

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1,
    example: 0.42,
    description: 'Tỉ lệ đã cuộn. Bỏ trống: giữ tiến độ cũ nếu vẫn chương đó, đổi chương thì về 0',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1)
  progress?: number
}
