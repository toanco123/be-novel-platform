// Bảng xếp hạng truyện công khai (như story_ranking của Supabase): lượt đọc theo kỳ, điểm có trọng số,
// người theo dõi.
import { Injectable } from '@nestjs/common'
import type { RankedStoryDto } from '../dto/ranked-story.dto'
import type { RankingQueryDto } from '../dto/ranking-query.dto'
import { StoriesRepository } from '../repositories/stories.repository'
import { StoryRankingRepository } from '../repositories/story-ranking.repository'
import { StoriesMapper } from '../stories.mapper'

@Injectable()
export class StoryRankingService {
  constructor(
    private readonly ranking: StoryRankingRepository,
    private readonly stories: StoriesRepository,
    private readonly mapper: StoriesMapper,
  ) {}

  async list({ by, period, limit }: RankingQueryDto): Promise<RankedStoryDto[]> {
    const ranked = await this.ranking.ranking(by, period, limit)
    const cards = new Map(
      (await this.stories.cardsByIds(ranked.map((r) => r.storyId))).map((row) => [row.id, row]),
    )
    return ranked.flatMap(({ storyId, value }) => {
      const card = cards.get(storyId)
      return card ? [{ value, story: this.mapper.toStory(card) }] : []
    })
  }
}
