import { Body, Controller, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Actor } from '@/common/auth/auth.types'
import { CurrentUser } from '@/common/auth/decorators/current-user.decorator'
import { RequireVerifiedEmail } from '@/common/auth/decorators/require-verified-email.decorator'
import { ResponseDto } from '@/common/response/decorators/response-dto.decorator'
import { ApiErrorResponses } from '@/common/swagger/api-error-responses.decorator'
import { ChapterParamsDto } from '@/modules/chapters/dto/chapter-params.dto'
import { ChapterReportDto } from '../dto/chapter-report.dto'
import { ReportChapterDto } from '../dto/report-chapter.dto'
import { ChapterReportsService } from '../services/chapter-reports.service'

@ApiTags('feedback')
@ApiBearerAuth()
@Controller('stories/:slug/chapters/:number/reports')
export class ChapterReportsController {
  constructor(private readonly reports: ChapterReportsService) {}

  @Post()
  @RequireVerifiedEmail()
  @ApiOperation({
    summary: 'Báo lỗi chương',
    description:
      'Cần đã xác nhận email. Chương đã xuất bản của truyện đang công khai. Báo lại cùng lý do ' +
      'khi báo lỗi cũ còn mở thì chỉ cập nhật ghi chú; báo lỗi mới tối đa 10 / giờ.',
  })
  @ResponseDto(ChapterReportDto, { status: 201 })
  @ApiErrorResponses(
    'unauthenticated',
    'invalid_token',
    'email_not_verified',
    'not_found',
    'story_not_public',
    'rate_limited',
    'validation_failed',
  )
  report(
    @CurrentUser() actor: Actor,
    @Param() { slug, number }: ChapterParamsDto,
    @Body() body: ReportChapterDto,
  ) {
    return this.reports.report(actor, slug, number, body)
  }
}
