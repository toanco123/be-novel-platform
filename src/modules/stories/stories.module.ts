import { Module } from '@nestjs/common'
import { StoriesController } from './stories.controller'
import { StoriesMapper } from './stories.mapper'
import { StoriesRepository } from './stories.repository'
import { StoriesService } from './stories.service'

@Module({
  controllers: [StoriesController],
  providers: [StoriesService, StoriesRepository, StoriesMapper],
})
export class StoriesModule {}
