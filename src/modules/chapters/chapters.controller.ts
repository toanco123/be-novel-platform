import { Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { Public } from '@/common/auth/decorators/public.decorator'
import { clientMeta } from '@/common/http/request-client'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ResponsePage } from '@/common/response/decorators/response-page.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { ChapterContentsQueryDto } from './dto/chapter-contents-query.dto'
import { ChapterListQueryDto } from './dto/chapter-list-query.dto'
import { ChapterParamsDto } from './dto/chapter-params.dto'
import { ChapterSummaryDto } from './dto/chapter-summary.dto'
import { ChapterDto } from './dto/chapter.dto'
import { ChapterViewsService } from './services/chapter-views.service'
import { ChaptersService } from './services/chapters.service'

@ApiTags('chapters')
@Controller('stories/:slug/chapters')
export class ChaptersController {
  constructor(
    private readonly chapters: ChaptersService,
    private readonly views: ChapterViewsService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Mục lục truyện',
    description:
      'Chương đã xuất bản, phân trang, theo số chương. Truyện không xem được (nháp của người ' +
      'khác...) → 404.',
  })
  @ResponsePage(ChapterSummaryDto)
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token')
  list(
    @Param('slug') slug: string,
    @Query() query: ChapterListQueryDto,
    @CurrentUser() actor: Actor | undefined,
  ) {
    return this.chapters.list(slug, query, actor)
  }

  // Khai báo trước ':number' để "contents" không bị hiểu là số chương
  @Get('contents')
  @Public()
  @ApiOperation({
    summary: 'Tải nhiều chương',
    description:
      'Tối đa `count` (≤ 20) chương đã xuất bản liên tiếp từ số `from`, mỗi chương như ' +
      '`GET …/chapters/:number` (tải trước, đọc offline). Hết chương → mảng rỗng.',
  })
  @ResponseDto(ChapterDto, { isArray: true })
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token')
  contents(
    @Param('slug') slug: string,
    @Query() query: ChapterContentsQueryDto,
    @CurrentUser() actor: Actor | undefined,
  ) {
    return this.chapters.contents(slug, query, actor)
  }

  @Get(':number')
  @Public()
  @ApiOperation({
    summary: 'Đọc một chương',
    description: 'Nội dung, thông tin truyện, chương đã xuất bản liền trước / liền sau.',
  })
  @ResponseDto(ChapterDto)
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token')
  get(@Param() { slug, number }: ChapterParamsDto, @CurrentUser() actor: Actor | undefined) {
    return this.chapters.get(slug, number, actor)
  }

  @Post(':number/views')
  @Public()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Ghi lượt đọc',
    description:
      'Mỗi người (khách: mỗi IP) 1 lượt / chương / ngày (giờ Việt Nam); không tính chủ truyện và ' +
      'truyện chưa công khai. Lượt không được tính vẫn trả 204.',
  })
  @ApiNoContentResponse({ description: 'Đã ghi (hoặc lượt không được tính)' })
  @ApiErrorResponses('not_found', 'validation_failed', 'invalid_token', 'rate_limited')
  async recordView(
    @Param() { slug, number }: ChapterParamsDto,
    @CurrentUser() actor: Actor | undefined,
    @Req() req: Request,
  ) {
    await this.views.record(slug, number, actor, clientMeta(req).ip)
  }
}
