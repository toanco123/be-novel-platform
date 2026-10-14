// Cột tính của thẻ truyện (như view story_cards của Supabase). Câu truy vấn phải join stories và
// story_stats.
import { sql } from 'drizzle-orm'
import { stories, storyStats } from '@/infra/database/schema'

/** createdAt của thẻ truyện: lần đầu công khai, chưa công khai thì lúc tạo */
export const cardCreatedAt = sql<Date>`coalesce(${stories.publishedAt}, ${stories.createdAt})`

/** updatedAt của thẻ truyện: mới nhất trong chương xuất bản gần nhất, lần đầu công khai, lúc tạo */
export const cardUpdatedAt = sql<Date>`greatest(${storyStats.lastChapterAt}, ${stories.publishedAt}, ${stories.createdAt})`
