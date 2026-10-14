// Bình luận (thay policy và trigger của Supabase): ai xem được truyện thì đọc được bình luận, trừ của
// người mình đã chặn. Viết / sửa vào truyện đang công khai (chương đã xuất bản), trả lời một cấp, chống
// gửi lặp, hạn mức 3 / phút và 30 / giờ. Xóa: người viết hoặc chủ truyện.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { pgErrorCode } from '@/common/errors/pg-error'
import { pageWindow } from '@/common/pagination/page'
import type { Page } from '@/common/pagination/pagination.types'
import { RateLimitService } from '@/common/rate-limit/rate-limit.service'
import { StoryAccessService } from '@/modules/stories/services/story-access.service'
import { canViewStory } from '@/modules/stories/stories.rules'
import { COMMENT_RATE_LIMITS, DUPLICATE_WINDOW_SECONDS, REPLIES_LIMIT } from '../comments.constants'
import { toComment } from '../comments.mapper'
import { CommentsRepository } from '../repositories/comments.repository'
import type { CommentTargetRow, NewComment } from '../comments.types'
import type { CommentListQueryDto } from '../dto/comment-list-query.dto'
import type { CommentDto } from '../dto/comment.dto'
import type { CreateCommentDto } from '../dto/create-comment.dto'

const rateKey = (userId: string, window: string) => `comments:create:user:${userId}:${window}`

@Injectable()
export class CommentsService {
  constructor(
    private readonly comments: CommentsRepository,
    private readonly access: StoryAccessService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Bình luận gốc của truyện / chương. Truyện không xem được → not_found */
  async list(
    slug: string,
    query: CommentListQueryDto,
    actor: Actor | undefined,
  ): Promise<Page<CommentDto>> {
    const story = await this.access.visible(slug, actor)
    const filter = { storyId: story.id, chapter: query.chapter ?? null, sort: query.sort }
    const [rows, total] = await Promise.all([
      this.comments.list(filter, actor?.id, pageWindow(query)),
      this.comments.count(filter, actor?.id),
    ])
    return { items: rows.map(toComment), total, page: query.page, pageSize: query.pageSize }
  }

  /** Trả lời của một bình luận; bình luận không có hoặc truyện không xem được → not_found */
  async replies(id: string, actor: Actor | undefined): Promise<CommentDto[]> {
    const target = await this.comments.findTarget(id)
    if (!target || !canViewStory(storyAccess(target), actor)) throw new AppException('not_found')
    return (await this.comments.replies(id, actor?.id, REPLIES_LIMIT)).map(toComment)
  }

  async create(actor: Actor, slug: string, input: CreateCommentDto): Promise<CommentDto> {
    const story = await this.access.public(slug, actor)
    const comment: NewComment = {
      storyId: story.id,
      chapterNumber: input.chapter ?? null,
      userId: actor.id,
      content: input.content,
      parentId: input.parentId ?? null,
    }
    if (
      comment.chapterNumber !== null &&
      !(await this.comments.isPublishedChapter(story.id, comment.chapterNumber))
    ) {
      throw new AppException('not_found')
    }
    if (comment.parentId) await this.checkParent(comment)
    if (await this.comments.hasRecentDuplicate(comment, DUPLICATE_WINDOW_SECONDS)) {
      throw new AppException('duplicate_comment')
    }
    for (const { key, options } of COMMENT_RATE_LIMITS) {
      const { allowed, retryAfterSeconds } = await this.rateLimit.peek(
        rateKey(actor.id, key),
        options,
      )
      if (!allowed) throw new AppException('rate_limited', { retryAfterSeconds })
    }

    let id: string
    try {
      id = await this.comments.insert(comment)
    } catch (error) {
      // Bình luận gốc vừa bị xóa trong lúc đang viết trả lời
      if (comment.parentId && pgErrorCode(error) === 'not_found') await this.checkParent(comment)
      throw error
    }
    for (const { key, options } of COMMENT_RATE_LIMITS) {
      await this.rateLimit.consume(rateKey(actor.id, key), options)
    }
    return this.view(id, actor)
  }

  /**
   * Người viết sửa nội dung khi truyện còn công khai và chương còn xuất bản. Không có → not_found;
   * của người khác → forbidden
   */
  async edit(actor: Actor, id: string, content: string): Promise<CommentDto> {
    const target = await this.comments.findTarget(id)
    if (!target) throw new AppException('not_found')
    if (target.userId !== actor.id) throw new AppException('forbidden')
    if (target.storyVisibility !== 'published') throw new AppException('story_not_public')
    if (
      target.chapterNumber !== null &&
      !(await this.comments.isPublishedChapter(target.storyId, target.chapterNumber))
    ) {
      throw new AppException('not_found')
    }
    await this.comments.updateContent(id, content)
    return this.view(id, actor)
  }

  /** Người viết hoặc chủ truyện xóa; trả lời mất theo */
  async remove(actor: Actor, id: string) {
    const target = await this.comments.findTarget(id)
    if (!target) throw new AppException('not_found')
    if (target.userId !== actor.id && target.storyOwnerId !== actor.id) {
      throw new AppException('forbidden')
    }
    await this.comments.remove(id)
  }

  /** Trả lời một cấp: bình luận gốc còn, không phải trả lời, cùng truyện và cùng chương */
  private async checkParent(comment: NewComment) {
    const parent = await this.comments.findTarget(comment.parentId!)
    if (!parent) throw new AppException('parent_not_found')
    if (
      parent.parentId !== null ||
      parent.storyId !== comment.storyId ||
      parent.chapterNumber !== comment.chapterNumber
    ) {
      throw new AppException('invalid_parent')
    }
  }

  private async view(id: string, actor: Actor) {
    const row = await this.comments.findById(id, actor.id)
    if (!row) throw new AppException('not_found')
    return toComment(row)
  }
}

/** Phần của truyện để xét quyền xem (canViewStory) */
const storyAccess = (target: CommentTargetRow) => ({
  visibility: target.storyVisibility,
  ownerId: target.storyOwnerId,
  reviewStatus: target.storyReviewStatus,
})
