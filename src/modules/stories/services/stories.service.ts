// Truyện cho người đọc. Ai xem được truyện nào: stories.rules.ts. Danh sách chỉ gồm truyện công khai có
// chương (isPublicStory), giống nhau với mọi người.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { pageWindow } from '@/common/pagination/page'
import type { Page } from '@/common/pagination/pagination.types'
import { parseAuthorSlug } from '../author-slug'
import type { RelatedQueryDto } from '../dto/related-query.dto'
import type { StoryDetailDto } from '../dto/story-detail.dto'
import type { StoryListQueryDto } from '../dto/story-list-query.dto'
import type { StoryDto } from '../dto/story.dto'
import { StoriesMapper } from '../stories.mapper'
import { StoriesRepository } from '../repositories/stories.repository'
import { StoryRankingRepository } from '../repositories/story-ranking.repository'
import { canViewStory } from '../stories.rules'

@Injectable()
export class StoriesService {
  constructor(
    private readonly stories: StoriesRepository,
    private readonly ranking: StoryRankingRepository,
    private readonly mapper: StoriesMapper,
  ) {}

  /** Danh sách truyện công khai có chương, theo bộ lọc */
  async list(query: StoryListQueryDto): Promise<Page<StoryDto>> {
    const filter = {
      status: query.status,
      genre: query.genre,
      length: query.length,
      // DTO đã kiểm tra dạng nên tách được
      author: query.author ? (parseAuthorSlug(query.author) ?? undefined) : undefined,
      sort: query.sort,
    }
    const [rows, total] = await Promise.all([
      this.stories.list(filter, pageWindow(query)),
      this.stories.count(filter),
    ])
    return {
      items: rows.map((row) => this.mapper.toStory(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  /** Chi tiết truyện. Không có, hoặc người gọi không được xem → not_found (không lộ truyện nháp) */
  async get(slug: string, actor: Actor | undefined): Promise<StoryDetailDto> {
    const row = await this.stories.findBySlug(slug)
    if (!row || !canViewStory(row, actor)) throw new AppException('not_found')
    return this.mapper.toStoryDetail(row)
  }

  /**
   * Truyện liên quan: nhiều thể loại trùng nhất, rồi nhiều lượt đọc nhất; bỏ truyện cùng chủ truyện.
   * Truyện gốc không xem được → not_found
   */
  async related(
    slug: string,
    { limit }: RelatedQueryDto,
    actor: Actor | undefined,
  ): Promise<StoryDto[]> {
    const story = await this.stories.findAccessBySlug(slug)
    if (!story || !canViewStory(story, actor)) throw new AppException('not_found')
    const ids = await this.ranking.related(story.id, story.ownerId, limit)
    return (await this.stories.cardsByIds(ids)).map((row) => this.mapper.toStory(row))
  }
}
