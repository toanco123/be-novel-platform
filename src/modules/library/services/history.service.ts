// Lịch sử đọc của người đăng nhập (dữ liệu riêng, không cần xác nhận email). Chỉ truyện người gọi xem
// được (canViewStory / isVisibleStory); truyện bị ẩn sau khi đọc thì tạm không hiện.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { truncateChars } from '@/common/utils/truncate'
import { StoriesRepository } from '@/modules/stories/repositories/stories.repository'
import { StoryAccessService } from '@/modules/stories/services/story-access.service'
import { StoriesMapper } from '@/modules/stories/stories.mapper'
import type { HistoryItemDto } from '../dto/history-item.dto'
import type { MergeHistoryEntryDto } from '../dto/merge-history-entry.dto'
import type { ReadingProgressDto } from '../dto/reading-progress.dto'
import type { SaveProgressDto } from '../dto/save-progress.dto'
import { toReadingProgress } from '../library.mapper'
import { HistoryRepository } from '../repositories/history.repository'
import { HISTORY_TITLE_LENGTH } from '../library.constants'

@Injectable()
export class HistoryService {
  constructor(
    private readonly history: HistoryRepository,
    private readonly stories: StoriesRepository,
    private readonly storiesMapper: StoriesMapper,
    private readonly access: StoryAccessService,
  ) {}

  /** Ghi chỗ đọc dở. Truyện không xem được → not_found */
  async save(actor: Actor, slug: string, input: SaveProgressDto): Promise<ReadingProgressDto> {
    const story = await this.access.visible(slug, actor)
    const row = await this.history.save(actor.id, story.id, {
      chapter: input.chapter,
      chapterTitle: truncateChars(input.chapterTitle ?? '', HISTORY_TITLE_LENGTH),
      progress: input.progress,
    })
    return toReadingProgress(slug, row)
  }

  /** Chỗ đọc dở của một truyện; chưa đọc → null. Truyện không xem được → not_found */
  async get(actor: Actor, slug: string): Promise<ReadingProgressDto | null> {
    const story = await this.access.visible(slug, actor)
    const row = await this.history.find(actor.id, story.id)
    return row ? toReadingProgress(slug, row) : null
  }

  async list(actor: Actor, limit: number): Promise<HistoryItemDto[]> {
    const rows = await this.history.list(actor, limit)
    const cards = new Map(
      (await this.stories.cardsByIds(rows.map((r) => r.storyId))).map((c) => [c.id, c]),
    )
    return rows.flatMap((row) => {
      const card = cards.get(row.storyId)
      return card
        ? [{ story: this.storiesMapper.toStory(card), progress: toReadingProgress(row.slug, row) }]
        : []
    })
  }

  async remove(actor: Actor, slug: string) {
    await this.history.remove(actor.id, slug)
  }

  async clear(actor: Actor) {
    await this.history.clear(actor.id)
  }

  /** Gộp lịch sử lúc còn là khách; readAt sau hiện tại hoặc bỏ trống thì coi là bây giờ */
  async merge(actor: Actor, entries: MergeHistoryEntryDto[]) {
    const now = Date.now()
    await this.history.merge(
      actor,
      entries.map((e) => ({
        slug: e.slug,
        chapter: e.chapter,
        chapterTitle: truncateChars(e.chapterTitle ?? '', HISTORY_TITLE_LENGTH),
        progress: e.progress ?? 0,
        readAt: new Date(Math.min(e.readAt ? Date.parse(e.readAt) : now, now)).toISOString(),
      })),
    )
  }
}
