import { Controller, Get, Header, Param, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ResponsePage } from '@/common/response/decorators/response-page.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { RelatedQueryDto } from '../dto/related-query.dto'
import { StoryDetailDto } from '../dto/story-detail.dto'
import { StoryListQueryDto } from '../dto/story-list-query.dto'
import { StoryDto } from '../dto/story.dto'
import { StoriesService } from '../services/stories.service'
import { STORIES_CACHE_CONTROL } from '../stories.constants'

@ApiTags('stories')
@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get()
  @Public()
  @Header('Cache-Control', STORIES_CACHE_CONTROL)
  @ApiOperation({
    summary: 'Danh sách truyện',
    description:
      'Truyện công khai có ít nhất một chương đã xuất bản. Lọc theo trạng thái, thể loại, độ dài, ' +
      'tác giả (`author.slug`); sắp xếp giảm dần. Mô tả chỉ 300 ký tự đầu.',
  })
  @ResponsePage(StoryDto)
  @ApiErrorResponses('validation_failed', 'invalid_token')
  list(@Query() query: StoryListQueryDto) {
    return this.stories.list(query)
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Chi tiết truyện',
    description:
      'Truyện công khai: mọi người. Truyện nháp: chỉ chủ truyện (xem trước). Truyện chờ duyệt: ' +
      'thêm quản trị viên. Không xem được thì 404 như truyện không tồn tại.',
  })
  @ResponseDto(StoryDetailDto)
  @ApiErrorResponses('not_found', 'invalid_token')
  get(@Param('slug') slug: string, @CurrentUser() actor: Actor | undefined) {
    return this.stories.get(slug, actor)
  }

  @Get(':slug/related')
  @Public()
  @ApiOperation({
    summary: 'Truyện liên quan',
    description:
      'Truyện công khai nhiều thể loại trùng nhất, rồi nhiều lượt đọc nhất; bỏ truyện cùng chủ ' +
      'truyện. Truyện gốc không xem được → 404.',
  })
  @ResponseDto(StoryDto, { isArray: true })
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token')
  related(
    @Param('slug') slug: string,
    @Query() query: RelatedQueryDto,
    @CurrentUser() actor: Actor | undefined,
  ) {
    return this.stories.related(slug, query, actor)
  }
}
