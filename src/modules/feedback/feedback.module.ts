import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { ChapterReportsController } from './controllers/chapter-reports.controller'
import { ContactController } from './controllers/contact.controller'
import { ChapterReportsRepository } from './repositories/chapter-reports.repository'
import { ContactRepository } from './repositories/contact.repository'
import { ChapterReportsService } from './services/chapter-reports.service'
import { ContactService } from './services/contact.service'

@Module({
  imports: [StoriesModule],
  controllers: [ChapterReportsController, ContactController],
  providers: [ChapterReportsService, ContactService, ChapterReportsRepository, ContactRepository],
})
export class FeedbackModule {}
