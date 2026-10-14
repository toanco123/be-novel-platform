import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { HistoryItemDto } from '../dto/history-item.dto'
import { HistoryQueryDto } from '../dto/history-query.dto'
import { MergeHistoryDto } from '../dto/merge-history.dto'
import { ReadingProgressDto } from '../dto/reading-progress.dto'
import { SaveProgressDto } from '../dto/save-progress.dto'
import { HistoryService } from '../services/history.service'

@ApiTags('library')
@ApiBearerAuth()
@Controller('me/history')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Lịch sử đọc',
    description: 'Mới đọc trước; chỉ truyện còn xem được (truyện bị ẩn tạm không hiện).',
  })
  @ResponseDto(HistoryItemDto, { isArray: true })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'validation_failed')
  list(@CurrentUser() actor: Actor, @Query() { limit }: HistoryQueryDto) {
    return this.history.list(actor, limit)
  }

  @Post('merge')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Gộp lịch sử lúc còn là khách',
    description:
      'Mỗi truyện lấy lần đọc mới nhất, chỉ ghi đè khi mới hơn trên máy chủ. Slug không có hoặc ' +
      'truyện không xem được thì bỏ qua.',
  })
  @ApiNoContentResponse({ description: 'Đã gộp' })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'validation_failed')
  async merge(@CurrentUser() actor: Actor, @Body() { entries }: MergeHistoryDto) {
    await this.history.merge(actor, entries)
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Chỗ đọc dở của một truyện', description: 'Chưa đọc → data: null.' })
  @ResponseDto(ReadingProgressDto, { nullable: true })
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'not_found')
  get(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    return this.history.get(actor, slug)
  }

  @Put(':slug')
  @ApiOperation({
    summary: 'Lưu chỗ đọc dở',
    description:
      'Gửi khi mở chương (không có progress: giữ tiến độ cũ nếu vẫn chương đó) và khi cuộn. ' +
      'Truyện không xem được → 404.',
  })
  @ResponseDto(ReadingProgressDto)
  @ApiErrorResponses('unauthenticated', 'invalid_token', 'not_found', 'validation_failed')
  save(@CurrentUser() actor: Actor, @Param('slug') slug: string, @Body() body: SaveProgressDto) {
    return this.history.save(actor, slug, body)
  }

  @Delete(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa một truyện khỏi lịch sử' })
  @ApiNoContentResponse({ description: 'Đã xóa (chưa có cũng vậy)' })
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  async remove(@CurrentUser() actor: Actor, @Param('slug') slug: string) {
    await this.history.remove(actor, slug)
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa hết lịch sử đọc' })
  @ApiNoContentResponse({ description: 'Đã xóa' })
  @ApiErrorResponses('unauthenticated', 'invalid_token')
  async clear(@CurrentUser() actor: Actor) {
    await this.history.clear(actor)
  }
}
