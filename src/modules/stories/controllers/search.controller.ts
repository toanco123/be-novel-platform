import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '@/common/auth/decorators/public.decorator'
import { ResponsePage } from '@/common/response/decorators/response-page.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { SearchQueryDto } from '../dto/search-query.dto'
import { StoryDto } from '../dto/story.dto'
import { StorySearchService } from '../services/story-search.service'

@ApiTags('stories')
@Controller('search')
export class SearchController {
  constructor(private readonly search: StorySearchService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Tìm truyện',
    description:
      'Theo tên truyện hoặc tác giả, không phân biệt dấu. Điểm: tên bắt đầu bằng từ khóa > tên ' +
      'chứa từ khóa > tên chứa đủ các từ > tên tác giả chứa từ khóa; cùng điểm thì đọc nhiều trước. ' +
      'Gợi ý nhanh: `pageSize=5`.',
  })
  @ResponsePage(StoryDto)
  @ApiErrorResponses('validation_failed', 'invalid_token')
  list(@Query() query: SearchQueryDto) {
    return this.search.search(query)
  }
}
