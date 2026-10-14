// Truyện chọn tay cho trang chủ (như curated_story_cards của Supabase). Chưa chọn tay (hoặc mọi truyện
// đã chọn không còn công khai) thì tự chọn như web: nổi bật theo lượt đọc, đề cử theo điểm.
import { Injectable } from '@nestjs/common'
import type { StoryDto } from '../dto/story.dto'
import { CURATED_FALLBACK } from '../stories.constants'
import { StoriesMapper } from '../stories.mapper'
import { StoriesRepository } from '../repositories/stories.repository'
import type { CuratedList } from '../stories.types'

@Injectable()
export class CuratedStoriesService {
  constructor(
    private readonly stories: StoriesRepository,
    private readonly mapper: StoriesMapper,
  ) {}

  async list(list: CuratedList): Promise<StoryDto[]> {
    let rows = await this.stories.curated(list)
    if (!rows.length) {
      const { sort, limit } = CURATED_FALLBACK[list]
      rows = await this.stories.list({ sort }, { offset: 0, limit })
    }
    return rows.map((row) => this.mapper.toStory(row))
  }
}
