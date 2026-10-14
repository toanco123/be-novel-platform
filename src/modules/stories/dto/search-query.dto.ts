import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength } from 'class-validator'
import { PageQueryDto } from '@/common/pagination/page-query.dto'
import { MAX_SEARCH_QUERY } from '../stories.constants'

/** Query tìm truyện */
export class SearchQueryDto extends PageQueryDto {
  @ApiProperty({
    maxLength: MAX_SEARCH_QUERY,
    example: 'dau pha',
    description: 'Không phân biệt dấu, hoa thường. Chỉ có ký tự đặc biệt → trang rỗng',
  })
  @IsString()
  @MaxLength(MAX_SEARCH_QUERY)
  q: string
}
