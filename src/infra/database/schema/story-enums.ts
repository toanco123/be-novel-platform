// Kiểu enum của truyện, chương: giá trị giống Supabase (migration catalog, story_review).
import { pgEnum } from 'drizzle-orm/pg-core'

export const storyStatus = pgEnum('story_status', ['ongoing', 'completed'])

/** Dùng cho cả stories.visibility và chapters.status */
export const publicationStatus = pgEnum('publication_status', ['draft', 'published'])

/** Trạng thái duyệt truyện; null: chưa gửi duyệt (hoặc bị gỡ) */
export const reviewStatus = pgEnum('review_status', ['pending', 'approved', 'rejected'])
