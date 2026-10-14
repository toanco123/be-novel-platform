import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsString, Max, Min } from 'class-validator'
import { MAX_CHAPTER_NUMBER } from '../chapters.constants'

/** Tham số đường dẫn /stories/:slug/chapters/:number */
export class ChapterParamsDto {
  @ApiProperty({ example: 'thanh-xuan-vuon-truong' })
  @IsString()
  slug: string

  @ApiProperty({ minimum: 1, maximum: MAX_CHAPTER_NUMBER, example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CHAPTER_NUMBER)
  number: number
}
