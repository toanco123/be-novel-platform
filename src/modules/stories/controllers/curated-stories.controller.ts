import { Controller, Get, Header, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '@/common/auth/decorators/public.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { CuratedStoriesQueryDto } from '../dto/curated-stories-query.dto'
import { StoryDto } from '../dto/story.dto'
import { CuratedStoriesService } from '../services/curated-stories.service'
import { STORIES_CACHE_CONTROL } from '../stories.constants'

// Đường dẫn riêng, không nằm dưới /stories để không đụng slug truyện
@ApiTags('stories')
@Controller('curated-stories')
export class CuratedStoriesController {
  constructor(private readonly curated: CuratedStoriesService) {}

  @Get()
  @Public()
  @Header('Cache-Control', STORIES_CACHE_CONTROL)
  @ApiOperation({
    summary: 'Truyện chọn tay cho trang chủ',
    description:
      'Theo thứ tự quản trị viên chọn, chỉ truyện công khai có chương. Chưa chọn thì tự chọn: ' +
      'featured là 4 truyện nhiều lượt đọc nhất, editor_pick là 8 truyện điểm cao nhất.',
  })
  @ResponseDto(StoryDto, { isArray: true })
  @ApiErrorResponses('validation_failed', 'invalid_token')
  list(@Query() { list }: CuratedStoriesQueryDto) {
    return this.curated.list(list)
  }
}
