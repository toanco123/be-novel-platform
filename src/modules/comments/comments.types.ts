import type { CommentReportReason, PublicationStatus, ReviewStatus } from '@/infra/database/schema'

/** Thứ tự bình luận gốc: mới nhất trước | nhiều lượt thích trước */
export type CommentSort = 'newest' | 'top'

/** Lọc bình luận gốc: của cả truyện (chapter null) hoặc của một chương */
export type CommentListFilter = { storyId: string; chapter: number | null; sort: CommentSort }

/** Một bình luận đọc ra cho người xem, kèm người viết và số trả lời người đó thấy */
export type CommentRow = {
  id: string
  storySlug: string
  chapterNumber: number | null
  userId: string
  displayName: string
  avatarUrl: string | null
  content: string
  createdAt: Date
  parentId: string | null
  replyCount: number
  likeCount: number
  /** Người xem đã thích chưa (khách: false) */
  likedByMe: boolean
  editedAt: Date | null
  isAuthor: boolean
}

/** Bình luận kèm thông tin truyện, để xét quyền sửa / xóa / trả lời */
export type CommentTargetRow = {
  id: string
  userId: string
  storyId: string
  chapterNumber: number | null
  parentId: string | null
  content: string
  storyVisibility: PublicationStatus
  storyOwnerId: string
  storyReviewStatus: ReviewStatus | null
}

/** Bình luận mới (đã qua kiểm tra) */
export type NewComment = {
  storyId: string
  chapterNumber: number | null
  userId: string
  content: string
  parentId: string | null
}

/** Báo cáo bình luận (đã chuẩn hóa) */
export type CommentReportInput = {
  reason: CommentReportReason
  note: string
  /** Nội dung bình luận lúc bị báo cáo */
  contentSnapshot: string
}
