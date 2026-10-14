import { Module } from '@nestjs/common'
import { CuratedStoriesController } from './controllers/curated-stories.controller'
import { RankingController } from './controllers/ranking.controller'
import { SearchController } from './controllers/search.controller'
import { StoriesController } from './controllers/stories.controller'
import { StoriesRepository } from './repositories/stories.repository'
import { StoryRankingRepository } from './repositories/story-ranking.repository'
import { CuratedStoriesService } from './services/curated-stories.service'
import { StoriesService } from './services/stories.service'
import { StoryRankingService } from './services/story-ranking.service'
import { StorySearchService } from './services/story-search.service'
import { StoriesMapper } from './stories.mapper'

@Module({
  controllers: [StoriesController, CuratedStoriesController, SearchController, RankingController],
  providers: [
    StoriesService,
    CuratedStoriesService,
    StorySearchService,
    StoryRankingService,
    StoriesRepository,
    StoryRankingRepository,
    StoriesMapper,
  ],
  // Chương (và các module đọc sau) tìm truyện, xét quyền xem, dựng thẻ truyện qua đây
  exports: [StoriesRepository, StoriesMapper],
})
export class StoriesModule {}
