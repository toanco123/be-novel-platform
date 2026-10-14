import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { chapterReports, chapters, profiles, stories } from '@/infra/database/schema'
import type { ChapterReportViewRow, NewChapterReport } from '../feedback.types'

/** Nơi duy nhất ghi chapter_reports (chủ truyện đọc, xử lý ở đợt Sáng tác) */
@Injectable()
export class ChapterReportsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Chương `number` của truyện có đang xuất bản không */
  async isPublishedChapter(storyId: string, number: number, ex: Executor = this.db) {
    const [row] = await ex
      .select({ number: chapters.number })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.number, number),
          eq(chapters.status, 'published'),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  /**
   * Báo lại (cùng người, cùng chương, cùng lý do, báo lỗi cũ còn mở): cập nhật ghi chú, lên đầu (như
   * trigger chapter_reports_touch). Trả id, không có báo lỗi đang mở thì null
   */
  async refreshOpen(report: NewChapterReport, ex: Executor = this.db) {
    const [row] = await ex
      .update(chapterReports)
      .set({ note: report.note, createdAt: sql`now()` })
      .where(
        and(
          eq(chapterReports.reporterId, report.reporterId),
          eq(chapterReports.storyId, report.storyId),
          eq(chapterReports.chapterNumber, report.chapterNumber),
          eq(chapterReports.reason, report.reason),
          eq(chapterReports.status, 'open'),
        ),
      )
      .returning({ id: chapterReports.id })
    return row?.id ?? null
  }

  /** Báo lỗi mới; trùng báo lỗi đang mở (gửi đồng thời) thì cập nhật như báo lại. Trả id */
  async insert(report: NewChapterReport, ex: Executor = this.db) {
    const [row] = await ex
      .insert(chapterReports)
      .values(report)
      .onConflictDoUpdate({
        target: [
          chapterReports.reporterId,
          chapterReports.storyId,
          chapterReports.chapterNumber,
          chapterReports.reason,
        ],
        targetWhere: sql`${chapterReports.status} = 'open'`,
        set: { note: sql`excluded.note`, createdAt: sql`now()` },
      })
      .returning({ id: chapterReports.id })
    return row!.id
  }

  async findView(id: string, ex: Executor = this.db): Promise<ChapterReportViewRow | null> {
    const [row] = await ex
      .select({
        id: chapterReports.id,
        storySlug: stories.slug,
        chapterNumber: chapterReports.chapterNumber,
        reason: chapterReports.reason,
        note: chapterReports.note,
        reporterId: chapterReports.reporterId,
        reporterName: profiles.displayName,
        status: chapterReports.status,
        createdAt: chapterReports.createdAt,
      })
      .from(chapterReports)
      .innerJoin(stories, eq(stories.id, chapterReports.storyId))
      .innerJoin(profiles, eq(profiles.id, chapterReports.reporterId))
      .where(eq(chapterReports.id, id))
      .limit(1)
    return row ?? null
  }
}
