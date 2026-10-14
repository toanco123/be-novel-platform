import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { CommentsService } from './comments.service'
import { CommentsRepository } from './comments.repository'
import { CommentsController } from './controllers/comments.controller'
import { StoryCommentsController } from './controllers/story-comments.controller'

@Module({
  imports: [StoriesModule],
  controllers: [StoryCommentsController, CommentsController],
  providers: [CommentsService, CommentsRepository],
})
export class CommentsModule {}
