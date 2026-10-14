// Báo lỗi chương (như RPC report_chapter của Supabase): chương đã xuất bản của truyện đang công khai.
// Báo lại cùng lý do khi báo lỗi cũ còn mở thì chỉ cập nhật ghi chú (không tính hạn mức); báo lỗi mới
// tối đa 10 / giờ.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { StoryAccessService } from '@/modules/stories/services/story-access.service'
import type { ChapterReportDto } from '../dto/chapter-report.dto'
import type { ReportChapterDto } from '../dto/report-chapter.dto'
import { CHAPTER_REPORT_RATE_LIMIT } from '../feedback.constants'
import { toChapterReport } from '../feedback.mapper'
import { ChapterReportsRepository } from '../repositories/chapter-reports.repository'

const rateKey = (userId: string) => `feedback:chapter-report:user:${userId}`

@Injectable()
export class ChapterReportsService {
  constructor(
    private readonly reports: ChapterReportsRepository,
    private readonly access: StoryAccessService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async report(
    actor: Actor,
    slug: string,
    chapterNumber: number,
    { reason, note = '' }: ReportChapterDto,
  ): Promise<ChapterReportDto> {
    if (reason === 'other' && !note) {
      throw new AppException('validation_failed', {
        issues: [{ path: 'note', code: 'requiredForOther', message: 'note is required for other' }],
      })
    }
    const story = await this.access.public(slug, actor)
    if (!(await this.reports.isPublishedChapter(story.id, chapterNumber))) {
      throw new AppException('not_found')
    }
    const report = { storyId: story.id, chapterNumber, reporterId: actor.id, reason, note }
    let id = await this.reports.refreshOpen(report)
    if (!id) {
      const { allowed, retryAfterSeconds } = await this.rateLimit.peek(
        rateKey(actor.id),
        CHAPTER_REPORT_RATE_LIMIT,
      )
      if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
      id = await this.reports.insert(report)
      await this.rateLimit.consume(rateKey(actor.id), CHAPTER_REPORT_RATE_LIMIT)
    }
    const row = await this.reports.findView(id)
    if (!row) throw new AppException('not_found')
    return toChapterReport(row)
  }
}
