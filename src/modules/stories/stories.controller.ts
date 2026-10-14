import { Controller, Get, Param } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { StoryDetailDto } from './dto/story-detail.dto'
import { StoriesService } from './stories.service'

@ApiTags('stories')
@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

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
}
