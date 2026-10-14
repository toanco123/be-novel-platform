import type { StoryDto } from '@/modules/stories/dto/story.dto'
import type { LibraryItemDto } from './dto/library-item.dto'
import type { ReadingProgressDto } from './dto/reading-progress.dto'
import type { LibraryRow, ProgressRow } from './library.types'

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

/** Một truyện đang theo dõi, kèm chỗ đọc dở (nếu có) */
export function toLibraryItem(
  story: StoryDto,
  row: LibraryRow,
  progress: ProgressRow | undefined,
): LibraryItemDto {
  return {
    story,
    followedAt: row.followedAt.toISOString(),
    seenChapter: row.seenChapter,
    newChapters: row.newChapters,
    progress: progress ? toReadingProgress(story.slug, progress) : null,
  }
}
