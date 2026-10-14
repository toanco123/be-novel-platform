import { ApiField } from '@/common/response/decorators/api-field.decorator'
import { REPORT_REASONS } from '../feedback.constants'
import { ReportReporterDto } from './report-reporter.dto'

/** Một báo lỗi chương (giống kiểu ChapterReport của web) */
export class ChapterReportDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ example: 'thanh-xuan-vuon-truong' })
  storySlug: string

  @ApiField({ example: 12 })
  chapterNumber: number

  @ApiField({ enum: REPORT_REASONS })
  reason: (typeof REPORT_REASONS)[number]

  @ApiField()
  note: string

  @ApiField({ type: ReportReporterDto })
  reporter: ReportReporterDto

  @ApiField({ enum: ['open', 'resolved'] })
  status: 'open' | 'resolved'

  @ApiField({ format: 'date-time', description: 'Lần báo (hoặc báo lại) gần nhất' })
  createdAt: string
}
