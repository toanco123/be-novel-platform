import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { RatingsController } from './ratings.controller'
import { RatingsRepository } from './ratings.repository'
import { RatingsService } from './ratings.service'

@Module({
  imports: [StoriesModule],
  controllers: [RatingsController],
  providers: [RatingsService, RatingsRepository],
})
export class RatingsModule {}
