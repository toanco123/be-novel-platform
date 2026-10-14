import type { ReadingProgressDto } from './dto/reading-progress.dto'
import type { ProgressRow } from './library.types'

/** Chỗ đọc dở của truyện `slug` → DTO */
export function toReadingProgress(slug: string, row: ProgressRow): ReadingProgressDto {
  return {
    slug,
    chapter: row.chapterNumber,
    chapterTitle: row.chapterTitle,
    progress: row.progress,
    readAt: row.readAt.toISOString(),
  }
}
