import { Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { BlocksService } from './blocks.service'
import { BlockedUserDto } from './dto/blocked-user.dto'
import { UserIdParamsDto } from './dto/user-id-params.dto'

@ApiTags('blocks')
@ApiBearerAuth()
@Controller()
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get('me/blocks')
  @ApiOperation({ summary: 'Người mình đã chặn', description: 'Mới chặn trước.' })
  @ResponseDto(BlockedUserDto, { isArray: true })
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  list(@CurrentUser() actor: Actor) {
    return this.blocks.list(actor)
  }

  @Put('users/:id/block')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Chặn người dùng',
    description:
      'Không còn thấy bình luận, trả lời của người này; người bị chặn không biết. Chặn lại cũng 204.',
  })
  @ApiNoContentResponse({ description: 'Đã chặn' })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'cannot_block_self',
    'not_found',
    'validation_failed',
  )
  async block(@CurrentUser() actor: Actor, @Param() { id }: UserIdParamsDto) {
    await this.blocks.block(actor, id)
  }

  @Delete('users/:id/block')
  @HttpCode(204)
  @ApiOperation({ summary: 'Bỏ chặn người dùng', description: 'Chưa chặn cũng 204.' })
  @ApiNoContentResponse({ description: 'Đã bỏ chặn' })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'validation_failed')
  async unblock(@CurrentUser() actor: Actor, @Param() { id }: UserIdParamsDto) {
    await this.blocks.unblock(actor, id)
  }
}
