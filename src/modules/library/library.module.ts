import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { HistoryController } from './history.controller'
import { HistoryRepository } from './history.repository'
import { HistoryService } from './history.service'

@Module({
  imports: [StoriesModule],
  controllers: [HistoryController],
  providers: [HistoryService, HistoryRepository],
})
export class LibraryModule {}
