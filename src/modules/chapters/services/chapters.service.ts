// Chương cho người đọc: ai xem được truyện (canViewStory) thì đọc được chương đã xuất bản của truyện
// đó; chương nháp không bao giờ hiện, kể cả với chủ truyện.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { pageWindow } from '@/common/pagination/page'
import type { Page } from '@/common/pagination/pagination.types'
import { StoriesMapper } from '@/modules/stories/stories.mapper'
import { StoriesRepository } from '@/modules/stories/stories.repository'
import { canViewStory } from '@/modules/stories/stories.rules'
import { toChapter, toChapterSummary, toReaderStory } from '../chapters.mapper'
import type { ChapterContentsQueryDto } from '../dto/chapter-contents-query.dto'
import type { ChapterListQueryDto } from '../dto/chapter-list-query.dto'
import type { ChapterSummaryDto } from '../dto/chapter-summary.dto'
import type { ChapterDto } from '../dto/chapter.dto'
import { ChaptersRepository } from '../repositories/chapters.repository'

@Injectable()
export class ChaptersService {
  constructor(
    private readonly stories: StoriesRepository,
    private readonly storiesMapper: StoriesMapper,
    private readonly chapters: ChaptersRepository,
  ) {}

  /** Mục lục (chương đã xuất bản). Truyện không xem được → not_found */
  async list(
    slug: string,
    query: ChapterListQueryDto,
    actor: Actor | undefined,
  ): Promise<Page<ChapterSummaryDto>> {
    const story = await this.stories.findAccessBySlug(slug)
    if (!story || !canViewStory(story, actor)) throw new AppException('not_found')
    const filter = { storyId: story.id, from: query.from, order: query.order }
    const [rows, total] = await Promise.all([
      this.chapters.list(filter, pageWindow(query)),
      this.chapters.count(filter),
    ])
    return { items: rows.map(toChapterSummary), total, page: query.page, pageSize: query.pageSize }
  }

  /** Một chương kèm chương trước / sau. Truyện không xem được, chương không có / nháp → not_found */
  async get(slug: string, number: number, actor: Actor | undefined): Promise<ChapterDto> {
    const story = await this.readerStory(slug, actor)
    const [row, prev, next] = await Promise.all([
      this.chapters.findPublished(story.id, number),
      this.chapters.neighbor(story.id, number, 'prev'),
      this.chapters.neighbor(story.id, number, 'next'),
    ])
    if (!row) throw new AppException('not_found')
    return toChapter(story.reader, row, prev, next)
  }

  /**
   * Tối đa `count` chương đã xuất bản liên tiếp từ số `from` (tải trước, đọc offline). Mục lục lấy
   * thêm một chương để biết chương sau của chương cuối đợt
   */
  async contents(
    slug: string,
    { from, count }: ChapterContentsQueryDto,
    actor: Actor | undefined,
  ): Promise<ChapterDto[]> {
    const story = await this.readerStory(slug, actor)
    const [rows, outline, prev] = await Promise.all([
      this.chapters.contentsFrom(story.id, from, count),
      this.chapters.outlineFrom(story.id, from, count + 1),
      this.chapters.neighbor(story.id, from, 'prev'),
    ])
    return rows.map((row, i) =>
      toChapter(story.reader, row, i === 0 ? prev : outline[i - 1], outline[i + 1]),
    )
  }

  /** Truyện theo slug (xét quyền xem) kèm thông tin truyện cho trang đọc */
  private async readerStory(slug: string, actor: Actor | undefined) {
    const row = await this.stories.findBySlug(slug)
    if (!row || !canViewStory(row, actor)) throw new AppException('not_found')
    return { id: row.id, reader: toReaderStory(this.storiesMapper.toStory(row)) }
  }
}
