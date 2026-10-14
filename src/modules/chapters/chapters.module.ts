import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { ChaptersController } from './chapters.controller'
import { ChapterViewsRepository } from './repositories/chapter-views.repository'
import { ChaptersRepository } from './repositories/chapters.repository'
import { ChapterViewsService } from './services/chapter-views.service'
import { ChaptersService } from './services/chapters.service'

@Module({
  imports: [StoriesModule],
  controllers: [ChaptersController],
  providers: [ChaptersService, ChapterViewsService, ChaptersRepository, ChapterViewsRepository],
})
export class ChaptersModule {}
