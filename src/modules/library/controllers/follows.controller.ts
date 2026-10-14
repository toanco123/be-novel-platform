import { Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { FollowStatusDto } from '../dto/follow-status.dto'
import { FollowsService } from '../services/follows.service'

@ApiTags('library')
@ApiBearerAuth()
@Controller('stories/:slug/follow')
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get()
  @ApiOperation({ summary: 'Có đang theo dõi truyện không' })
  @ResponseDto(FollowStatusDto)
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'not_found')
  status(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    return this.follows.status(actor, slug)
  }

  @Put()
  @HttpCode(204)
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Theo dõi truyện',
    description:
      'Cần đã xác nhận email. Mốc "đã thấy" là chương mới nhất hiện có (hoặc chương đã đọc tới ' +
      'nếu xa hơn). Đã theo dõi rồi cũng 204.',
  })
  @ApiNoContentResponse({ description: 'Đang theo dõi' })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'email_not_verified', 'not_found')
  async follow(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    await this.follows.follow(actor, slug)
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Bỏ theo dõi truyện', description: 'Chưa theo dõi cũng 204.' })
  @ApiNoContentResponse({ description: 'Không còn theo dõi' })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'not_found')
  async unfollow(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    await this.follows.unfollow(actor, slug)
  }
}
