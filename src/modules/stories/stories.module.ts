import { Module } from '@nestjs/common'
import { CuratedStoriesController } from './controllers/curated-stories.controller'
import { StoriesController } from './controllers/stories.controller'
import { CuratedStoriesService } from './services/curated-stories.service'
import { StoriesService } from './services/stories.service'
import { StoriesMapper } from './stories.mapper'
import { StoriesRepository } from './stories.repository'

@Module({
  controllers: [StoriesController, CuratedStoriesController],
  providers: [StoriesService, CuratedStoriesService, StoriesRepository, StoriesMapper],
  // Chương (và các module đọc sau) tìm truyện, xét quyền xem, dựng thẻ truyện qua đây
  exports: [StoriesRepository, StoriesMapper],
})
export class StoriesModule {}
