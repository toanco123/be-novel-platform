// Báo cáo bình luận vi phạm (như RPC report_comment của Supabase): bình luận của người khác trong truyện
// đang công khai. Báo lại thì cập nhật báo cáo đang mở (không tính hạn mức); báo cáo mới tối đa 10 /
// giờ. Lưu nội dung lúc báo cáo để sửa bình luận không xóa được dấu vết.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { REPORT_RATE_LIMIT } from '../comments.constants'
import type { ReportCommentDto } from '../dto/report-comment.dto'
import { CommentReportsRepository } from '../repositories/comment-reports.repository'
import { CommentsRepository } from '../repositories/comments.repository'

const rateKey = (userId: string) => `comments:report:user:${userId}`

@Injectable()
export class CommentReportsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly reports: CommentReportsRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  async report(actor: Actor, commentId: string, { reason, note = '' }: ReportCommentDto) {
    if (reason === 'other' && !note) {
      throw new AppException('validation_failed', {
        issues: [{ path: 'note', code: 'requiredForOther', message: 'note is required for other' }],
      })
    }
    const target = await this.comments.findTarget(commentId)
    if (!target || target.storyVisibility !== 'published') throw new AppException('not_found')
    if (target.userId === actor.id) throw new AppException('own_comment_report')

    const input = { reason, note, contentSnapshot: target.content }
    if (await this.reports.refreshOpen(actor.id, commentId, input)) return

    const { allowed, retryAfterSeconds } = await this.rateLimit.peek(
      rateKey(actor.id),
      REPORT_RATE_LIMIT,
    )
    if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    await this.reports.insert(actor.id, commentId, input)
    await this.rateLimit.consume(rateKey(actor.id), REPORT_RATE_LIMIT)
  }
}
