// Thích bình luận (thay trigger comment_likes_guard của Supabase): bình luận của truyện đang công khai,
// không tự thích, tối đa 300 lượt thích mới / giờ. Thích lại / bỏ thích khi chưa thích đều không lỗi.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { LIKE_RATE_LIMIT } from '../comments.constants'
import { CommentLikesRepository } from '../repositories/comment-likes.repository'
import { CommentsRepository } from '../repositories/comments.repository'

const rateKey = (userId: string) => `comments:like:user:${userId}`

@Injectable()
export class CommentLikesService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly likes: CommentLikesRepository,
    private readonly rateLimit: RateLimitService,
  ) {}

  async like(actor: Actor, commentId: string) {
    const target = await this.comments.findTarget(commentId)
    if (!target) throw new AppException('not_found')
    if (target.storyVisibility !== 'published') throw new AppException('story_not_public')
    if (target.userId === actor.id) throw new AppException('own_comment_like')
    if (await this.likes.exists(actor.id, commentId)) return

    const { allowed, retryAfterSeconds } = await this.rateLimit.peek(
      rateKey(actor.id),
      LIKE_RATE_LIMIT,
    )
    if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    // Chỉ tính lượt thích thật sự mới (bấm hai lần đồng thời thì lượt sau không tính)
    if (await this.likes.like(actor.id, commentId)) {
      await this.rateLimit.consume(rateKey(actor.id), LIKE_RATE_LIMIT)
    }
  }

  async unlike(actor: Actor, commentId: string) {
    await this.likes.unlike(actor.id, commentId)
  }
}
