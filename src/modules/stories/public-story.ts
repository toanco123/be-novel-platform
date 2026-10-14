import { and, eq, gt, type SQL } from 'drizzle-orm'
import { stories, storyStats } from '@/infra/database/schema'

/**
 * Truyện hiện ở danh sách công khai (và được đếm vào số truyện của thể loại): đã công khai và có ít
 * nhất một chương đã xuất bản. Câu truy vấn phải join stories với story_stats.
 */
export const isPublicStory = (): SQL =>
  and(eq(stories.visibility, 'published'), gt(storyStats.chapterCount, 0))!
