// Tủ truyện: truyện đang theo dõi còn xem được, kèm số chương mới và chỗ đọc dở.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { StoriesRepository } from '@/modules/stories/repositories/stories.repository'
import { StoriesMapper } from '@/modules/stories/stories.mapper'
import type { LibraryItemDto } from '../dto/library-item.dto'
import type { UpdateCountDto } from '../dto/update-count.dto'
import { toLibraryItem } from '../library.mapper'
import { FollowsRepository } from '../repositories/follows.repository'
import { HistoryRepository } from '../repositories/history.repository'

@Injectable()
export class LibraryService {
  constructor(
    private readonly follows: FollowsRepository,
    private readonly history: HistoryRepository,
    private readonly stories: StoriesRepository,
    private readonly storiesMapper: StoriesMapper,
  ) {}

  async list(actor: Actor): Promise<LibraryItemDto[]> {
    const rows = await this.follows.library(actor)
    const ids = rows.map((row) => row.storyId)
    const [cards, progress] = await Promise.all([
      this.stories.cardsByIds(ids),
      this.history.findMany(actor.id, ids),
    ])
    const cardById = new Map(cards.map((card) => [card.id, card]))
    const progressById = new Map(progress.map((p) => [p.storyId, p]))
    return rows.flatMap((row) => {
      const card = cardById.get(row.storyId)
      if (!card) return []
      return [toLibraryItem(this.storiesMapper.toStory(card), row, progressById.get(row.storyId))]
    })
  }

  async updateCount(actor: Actor): Promise<UpdateCountDto> {
    return { count: await this.follows.updateCount(actor) }
  }
}
