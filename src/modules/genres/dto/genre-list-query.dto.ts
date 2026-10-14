import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { PageQueryDto } from '@/common/pagination/page-query.dto'
import { MAX_GENRE_QUERY } from '../genres.constants'

/** Query danh sách thể loại: phân trang, tìm theo tên */
export class GenreListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    maxLength: MAX_GENRE_QUERY,
    example: 'ngon tinh',
    description:
      'Chỉ thể loại có slug chứa slugify(q) (không phân biệt dấu). Chỉ có ký tự đặc biệt → trang rỗng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_GENRE_QUERY)
  q?: string
}
