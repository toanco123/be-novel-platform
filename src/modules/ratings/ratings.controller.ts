import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { MyRatingDto } from './dto/my-rating.dto'
import { RateStoryDto } from './dto/rate-story.dto'
import { RatingsService } from './ratings.service'

@ApiTags('ratings')
@ApiBearerAuth()
@Controller('stories/:slug/rating')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  @ApiOperation({ summary: 'Điểm mình đã chấm cho truyện', description: 'Chưa chấm: score null.' })
  @ResponseDto(MyRatingDto)
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'not_found')
  mine(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    return this.ratings.mine(actor, slug)
  }

  @Put()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Chấm điểm truyện',
    description:
      'Cần đã xác nhận email. Chấm lại thì thay điểm cũ. Truyện chưa công khai → 409 ' +
      '`story_not_public`. Điểm trung bình, phân bố sao xem ở `GET /v1/stories/:slug`.',
  })
  @ResponseDto(MyRatingDto)
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'not_found',
    'story_not_public',
    'validation_failed',
  )
  rate(@CurrentUser() actor: Actor, @Param('slug') slug: string, @Body() { score }: RateStoryDto) {
    return this.ratings.rate(actor, slug, score)
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa điểm đã chấm', description: 'Chưa chấm cũng 204.' })
  @ApiNoContentResponse({ description: 'Đã xóa' })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'not_found')
  async remove(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    await this.ratings.remove(actor, slug)
  }
}
