import type { CommentRow } from './comments.types'
import type { CommentDto } from './dto/comment.dto'

export function toComment(row: CommentRow): CommentDto {
  return {
    id: row.id,
    storySlug: row.storySlug,
    chapterNumber: row.chapterNumber,
    user: { id: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl },
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    parentId: row.parentId,
    replyCount: row.replyCount,
    likeCount: row.likeCount,
    likedByMe: row.likedByMe,
    editedAt: row.editedAt?.toISOString() ?? null,
    isAuthor: row.isAuthor,
  }
}
