// Truyện cho người đọc. Ai xem được truyện nào: stories.rules.ts.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import type { StoryDetailDto } from './dto/story-detail.dto'
import { StoriesMapper } from './stories.mapper'
import { StoriesRepository } from './stories.repository'
import { canViewStory } from './stories.rules'

@Injectable()
export class StoriesService {
  constructor(
    private readonly stories: StoriesRepository,
    private readonly mapper: StoriesMapper,
  ) {}

  /** Chi tiết truyện. Không có, hoặc người gọi không được xem → not_found (không lộ truyện nháp) */
  async get(slug: string, actor: Actor | undefined): Promise<StoryDetailDto> {
    const row = await this.stories.findBySlug(slug)
    if (!row || !canViewStory(row, actor)) throw new AppException('not_found')
    return this.mapper.toStoryDetail(row)
  }
}
