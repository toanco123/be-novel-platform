import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'
import type { CommentSort } from './comments.types'

/** Mỗi người tối đa 3 bình luận / phút và 30 / giờ, tính cả trả lời (như trigger comments_rate_limit) */
export const COMMENT_RATE_LIMITS: { key: string; options: RateLimitOptions }[] = [
  { key: 'minute', options: { limit: 3, windowSeconds: 60 } },
  { key: 'hour', options: { limit: 30, windowSeconds: 3600 } },
]

/** Gửi lại đúng nội dung vừa gửi (cùng truyện, cùng chương) trong 10 phút là gửi lặp */
export const DUPLICATE_WINDOW_SECONDS = 600

/** Số trả lời tối đa tải về cho một bình luận (REPLIES_LIMIT của web) */
export const REPLIES_LIMIT = 200

/** Nội dung 1–1000 ký tự (check comments_content_check) */
export const MAX_COMMENT_LENGTH = 1000

export const COMMENT_SORTS = ['newest', 'top'] as const satisfies CommentSort[]
