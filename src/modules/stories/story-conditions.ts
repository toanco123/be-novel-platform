// Điều kiện SQL dùng chung cho truy vấn truyện. Câu truy vấn phải join stories (và story_stats với
// isPublicStory).
import { and, eq, gt, or, type SQL } from 'drizzle-orm'
import type { Actor } from '@/common/auth/auth.types'
import { stories, storyStats } from '@/infra/database/schema'

/**
 * Truyện hiện ở danh sách công khai (và được đếm vào số truyện của thể loại): đã công khai và có ít
 * nhất một chương đã xuất bản
 */
export const isPublicStory = (): SQL =>
  and(eq(stories.visibility, 'published'), gt(storyStats.chapterCount, 0))!

/**
 * Truyện người gọi xem được, cùng luật với canViewStory (stories.rules.ts): công khai; của mình; chờ
 * duyệt với quản trị viên
 */
export const isVisibleStory = (actor: Actor | undefined): SQL => {
  if (!actor) return eq(stories.visibility, 'published')
  return or(
    eq(stories.visibility, 'published'),
    eq(stories.ownerId, actor.id),
    actor.role === 'admin' ? eq(stories.reviewStatus, 'pending') : undefined,
  )!
}
