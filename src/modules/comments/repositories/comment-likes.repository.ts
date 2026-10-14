import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { commentLikes } from '@/infra/database/schema'

/** Nơi duy nhất ghi comment_likes. comments.like_count do trigger comment_likes_count ghi */
@Injectable()
export class CommentLikesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async exists(userId: string, commentId: string, ex: Executor = this.db) {
    const [row] = await ex
      .select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
      .limit(1)
    return row !== undefined
  }

  /** Thích; trả true nếu là lượt thích mới (đã thích rồi thì false) */
  async like(userId: string, commentId: string, ex: Executor = this.db) {
    const rows = await ex
      .insert(commentLikes)
      .values({ userId, commentId })
      .onConflictDoNothing()
      .returning({ commentId: commentLikes.commentId })
    return rows.length > 0
  }

  async unlike(userId: string, commentId: string, ex: Executor = this.db) {
    await ex
      .delete(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
  }
}
