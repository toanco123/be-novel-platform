import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, desc, eq, gt, isNull, type SQL, sql } from 'drizzle-orm'
import type { PageWindow } from '@/common/pagination/pagination.types'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { chapters, commentLikes, comments, profiles, stories } from '@/infra/database/schema'
import { notBlockedBy } from '@/modules/blocks/block-conditions'
import type {
  CommentListFilter,
  CommentRow,
  CommentSort,
  CommentTargetRow,
  NewComment,
} from '../comments.types'

const SORT_ORDER: Record<CommentSort, SQL[]> = {
  newest: [desc(comments.createdAt), desc(comments.id)],
  top: [desc(comments.likeCount), desc(comments.createdAt), desc(comments.id)],
}

/** Bình luận của cả truyện (chapter null) hoặc của một chương */
const inChapter = (chapter: number | null) =>
  chapter === null ? isNull(comments.chapterNumber) : eq(comments.chapterNumber, chapter)

/** Nơi duy nhất truy vấn comments */
@Injectable()
export class CommentsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Một trang bình luận gốc, bỏ bình luận của người người xem đã chặn */
  async list(
    filter: CommentListFilter,
    viewerId: string | undefined,
    { offset, limit }: PageWindow,
    ex: Executor = this.db,
  ): Promise<CommentRow[]> {
    return this.selectComments(viewerId, ex)
      .where(this.rootsWhere(filter, viewerId))
      .orderBy(...SORT_ORDER[filter.sort])
      .limit(limit)
      .offset(offset)
  }

  async count(filter: CommentListFilter, viewerId: string | undefined, ex: Executor = this.db) {
    const [row] = await ex
      .select({ total: count() })
      .from(comments)
      .where(this.rootsWhere(filter, viewerId))
    return row!.total
  }

  /** Trả lời của bình luận `parentId`, cũ trước; bỏ trả lời của người người xem đã chặn */
  async replies(
    parentId: string,
    viewerId: string | undefined,
    limit: number,
    ex: Executor = this.db,
  ): Promise<CommentRow[]> {
    return this.selectComments(viewerId, ex)
      .where(and(eq(comments.parentId, parentId), notBlockedBy(viewerId, comments.userId)))
      .orderBy(asc(comments.createdAt), asc(comments.id))
      .limit(limit)
  }

  async findById(
    id: string,
    viewerId: string | undefined,
    ex: Executor = this.db,
  ): Promise<CommentRow | null> {
    const [row] = await this.selectComments(viewerId, ex).where(eq(comments.id, id)).limit(1)
    return row ?? null
  }

  /** Bình luận kèm thông tin truyện để xét quyền (không lọc người bị chặn) */
  async findTarget(id: string, ex: Executor = this.db): Promise<CommentTargetRow | null> {
    const [row] = await ex
      .select({
        id: comments.id,
        userId: comments.userId,
        storyId: comments.storyId,
        chapterNumber: comments.chapterNumber,
        parentId: comments.parentId,
        content: comments.content,
        storyVisibility: stories.visibility,
        storyOwnerId: stories.ownerId,
        storyReviewStatus: stories.reviewStatus,
      })
      .from(comments)
      .innerJoin(stories, eq(stories.id, comments.storyId))
      .where(eq(comments.id, id))
      .limit(1)
    return row ?? null
  }

  /** Chương `number` của truyện có đang xuất bản không */
  async isPublishedChapter(storyId: string, number: number, ex: Executor = this.db) {
    const [row] = await ex
      .select({ number: chapters.number })
      .from(chapters)
      .where(
        and(
          eq(chapters.storyId, storyId),
          eq(chapters.number, number),
          eq(chapters.status, 'published'),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  /** Người này vừa gửi đúng nội dung này (cùng truyện, cùng chương) trong `seconds` giây qua */
  async hasRecentDuplicate(
    { userId, storyId, chapterNumber, content }: Omit<NewComment, 'parentId'>,
    seconds: number,
    ex: Executor = this.db,
  ) {
    const [row] = await ex
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.userId, userId),
          eq(comments.storyId, storyId),
          sql`${comments.chapterNumber} is not distinct from ${chapterNumber}`,
          eq(comments.content, content),
          gt(comments.createdAt, sql`now() - make_interval(secs => ${seconds})`),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  /** Thêm bình luận; trả id. Bình luận gốc / chương vừa bị xóa → lỗi khóa ngoại 23503 */
  async insert(comment: NewComment, ex: Executor = this.db) {
    const [row] = await ex.insert(comments).values(comment).returning({ id: comments.id })
    return row!.id
  }

  /** Sửa nội dung; nội dung đổi thì ghi lúc sửa (như trigger comments_set_edited_at) */
  async updateContent(id: string, content: string, ex: Executor = this.db) {
    await ex
      .update(comments)
      .set({
        content,
        editedAt: sql`case when ${comments.content} is distinct from ${content} then now() else ${comments.editedAt} end`,
      })
      .where(eq(comments.id, id))
  }

  /** Xóa bình luận; trả lời mất theo (khóa ngoại cascade) */
  async remove(id: string, ex: Executor = this.db) {
    await ex.delete(comments).where(eq(comments.id, id))
  }

  private rootsWhere({ storyId, chapter }: CommentListFilter, viewerId: string | undefined) {
    return and(
      eq(comments.storyId, storyId),
      isNull(comments.parentId),
      inChapter(chapter),
      notBlockedBy(viewerId, comments.userId),
    )
  }

  /** Bình luận kèm người viết (hồ sơ hiện tại), slug truyện, số trả lời người xem thấy, nhãn Tác giả */
  private selectComments(viewerId: string | undefined, ex: Executor) {
    return ex
      .select({
        id: comments.id,
        storySlug: stories.slug,
        chapterNumber: comments.chapterNumber,
        userId: comments.userId,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        content: comments.content,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        // Alias viết thẳng trong SQL: bảng alias của Drizzle trong sql`` chỉ ra tên alias, thiếu tên bảng
        replyCount: sql<number>`(
          select count(*) from ${comments} as replies
          where replies.parent_id = ${comments.id}
            and ${notBlockedBy(viewerId, sql`replies.user_id`)}
        )`.mapWith(Number),
        likeCount: comments.likeCount,
        likedByMe: viewerId
          ? sql<boolean>`exists (select 1 from ${commentLikes} where ${commentLikes.commentId} = ${comments.id} and ${commentLikes.userId} = ${viewerId})`
          : sql<boolean>`false`,
        editedAt: comments.editedAt,
        isAuthor: sql<boolean>`(${comments.userId} = ${stories.ownerId} and ${stories.authorName} is null)`,
      })
      .from(comments)
      .innerJoin(profiles, eq(profiles.id, comments.userId))
      .innerJoin(stories, eq(stories.id, comments.storyId))
  }
}
