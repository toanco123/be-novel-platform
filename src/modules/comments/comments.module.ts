import { Module } from '@nestjs/common'
import { StoriesModule } from '@/modules/stories/stories.module'
import { CommentsController } from './controllers/comments.controller'
import { StoryCommentsController } from './controllers/story-comments.controller'
import { CommentLikesRepository } from './repositories/comment-likes.repository'
import { CommentReportsRepository } from './repositories/comment-reports.repository'
import { CommentsRepository } from './repositories/comments.repository'
import { CommentLikesService } from './services/comment-likes.service'
import { CommentReportsService } from './services/comment-reports.service'
import { CommentsService } from './services/comments.service'

@Module({
  imports: [StoriesModule],
  controllers: [StoryCommentsController, CommentsController],
  providers: [
    CommentsService,
    CommentLikesService,
    CommentReportsService,
    CommentsRepository,
    CommentLikesRepository,
    CommentReportsRepository,
  ],
})
export class CommentsModule {}
