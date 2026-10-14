import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { FollowsController } from './controllers/follows.controller'
import { HistoryController } from './controllers/history.controller'
import { LibraryController } from './controllers/library.controller'
import { FollowsRepository } from './repositories/follows.repository'
import { HistoryRepository } from './repositories/history.repository'
import { FollowsService } from './services/follows.service'
import { HistoryService } from './services/history.service'
import { LibraryService } from './services/library.service'

@Module({
  imports: [StoriesModule],
  controllers: [HistoryController, FollowsController, LibraryController],
  providers: [HistoryService, FollowsService, LibraryService, HistoryRepository, FollowsRepository],
})
export class LibraryModule {}
