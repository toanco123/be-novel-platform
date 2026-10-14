import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { commentReports } from '@/infra/database/schema'
import type { CommentReportInput } from '../comments.types'

/** Nơi duy nhất ghi comment_reports (quản trị viên đọc ở đợt Quản trị) */
@Injectable()
export class CommentReportsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Cập nhật báo cáo đang mở của người này cho bình luận này (báo lại): lý do, ghi chú, nội dung lúc
   * báo cáo, lên đầu hàng chờ. Trả true nếu có báo cáo đang mở
   */
  async refreshOpen(
    reporterId: string,
    commentId: string,
    input: CommentReportInput,
    ex: Executor = this.db,
  ) {
    const rows = await ex
      .update(commentReports)
      .set({ ...input, createdAt: sql`now()` })
      .where(
        and(
          eq(commentReports.reporterId, reporterId),
          eq(commentReports.commentId, commentId),
          eq(commentReports.status, 'open'),
        ),
      )
      .returning({ id: commentReports.id })
    return rows.length > 0
  }

  /** Báo cáo mới; trùng báo cáo đang mở (gửi đồng thời) thì cập nhật như báo lại */
  async insert(
    reporterId: string,
    commentId: string,
    input: CommentReportInput,
    ex: Executor = this.db,
  ) {
    await ex
      .insert(commentReports)
      .values({ reporterId, commentId, ...input })
      .onConflictDoUpdate({
        target: [commentReports.reporterId, commentReports.commentId],
        targetWhere: sql`${commentReports.status} = 'open'`,
        set: {
          reason: sql`excluded.reason`,
          note: sql`excluded.note`,
          contentSnapshot: sql`excluded.content_snapshot`,
          createdAt: sql`now()`,
        },
      })
  }
}
