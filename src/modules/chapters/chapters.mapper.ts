import type { StoryDto } from '@/modules/stories/dto/story.dto'
import type { ChapterSummaryDto } from './dto/chapter-summary.dto'
import type { ChapterDto } from './dto/chapter.dto'
import type { ReaderStoryDto } from './dto/reader-story.dto'
import type { ChapterContentRow, ChapterOutlineRow, ChapterSummaryRow } from './chapters.types'

/** Chương đã xuất bản luôn có published_at; dữ liệu cũ thiếu thì lùi về created_at (như web) */
const publishedAt = (row: ChapterSummaryRow) => (row.publishedAt ?? row.createdAt).toISOString()

const toRef = (row: ChapterOutlineRow | null | undefined) =>
  row ? { number: row.number, title: row.title } : null

export function toChapterSummary(row: ChapterSummaryRow): ChapterSummaryDto {
  return { number: row.number, title: row.title, publishedAt: publishedAt(row) }
}

/** Thông tin truyện đi kèm chương, lấy từ thẻ truyện */
export function toReaderStory(story: StoryDto): ReaderStoryDto {
  return {
    slug: story.slug,
    title: story.title,
    author: story.author,
    status: story.status,
    chapterCount: story.chapterCount,
    coverUrl: story.coverUrl,
    visibility: story.visibility,
    nextChapter: story.nextChapter,
  }
}

export function toChapter(
  story: ReaderStoryDto,
  row: ChapterContentRow,
  prev: ChapterOutlineRow | null | undefined,
  next: ChapterOutlineRow | null | undefined,
): ChapterDto {
  return {
    story,
    number: row.number,
    title: row.title,
    content: row.content,
    publishedAt: publishedAt(row),
    prev: toRef(prev),
    next: toRef(next),
  }
}
