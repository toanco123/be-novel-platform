import { Controller, Get, Header, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '@/common/auth/decorators/public.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { RankedStoryDto } from '../dto/ranked-story.dto'
import { RankingQueryDto } from '../dto/ranking-query.dto'
import { StoryRankingService } from '../services/story-ranking.service'
import { STORIES_CACHE_CONTROL } from '../stories.constants'

@ApiTags('stories')
@Controller('ranking')
export class RankingController {
  constructor(private readonly ranking: StoryRankingService) {}

  @Get()
  @Public()
  @Header('Cache-Control', STORIES_CACHE_CONTROL)
  @ApiOperation({
    summary: 'Bảng xếp hạng',
    description:
      'Truyện công khai có chương. views: lượt đọc 7 / 30 ngày gần nhất (giờ Việt Nam) hoặc tổng; ' +
      'rating: điểm có trọng số (value là điểm trung bình thật); follows: người theo dõi. Chỉ ' +
      'truyện có số liệu > 0.',
  })
  @ResponseDto(RankedStoryDto, { isArray: true })
  @ApiErrorResponses('validation_failed', 'invalid_token')
  list(@Query() query: RankingQueryDto) {
    return this.ranking.list(query)
  }
}
