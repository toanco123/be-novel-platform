import { Module } from '@nestjs/common'
import { StoriesController } from './stories.controller'
import { StoriesMapper } from './stories.mapper'
import { StoriesRepository } from './stories.repository'
import { StoriesService } from './stories.service'

@Module({
  controllers: [StoriesController],
  providers: [StoriesService, StoriesRepository, StoriesMapper],
  // Chương (và các module đọc sau) tìm truyện, xét quyền xem, dựng thẻ truyện qua đây
  exports: [StoriesRepository, StoriesMapper],
})
export class StoriesModule {}
