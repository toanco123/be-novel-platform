import type { ChapterReportDto } from './dto/chapter-report.dto'
import type { ChapterReportViewRow } from './feedback.types'

export function toChapterReport(row: ChapterReportViewRow): ChapterReportDto {
  return {
    id: row.id,
    storySlug: row.storySlug,
    chapterNumber: row.chapterNumber,
    reason: row.reason,
    note: row.note,
    reporter: { id: row.reporterId, displayName: row.reporterName },
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}
