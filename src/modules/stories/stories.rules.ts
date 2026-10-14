import type { Actor } from '@/common/auth/auth.types'
import type { StoryAccess } from './stories.types'

/**
 * Ai xem được truyện (như policy stories_select_visible của Supabase): truyện công khai thì mọi
 * người; truyện nháp thì chủ truyện (xem trước); truyện đang chờ duyệt thì cả quản trị viên
 */
export function canViewStory(story: StoryAccess, actor: Actor | undefined) {
  if (story.visibility === 'published') return true
  if (!actor) return false
  if (actor.id === story.ownerId) return true
  return actor.role === 'admin' && story.reviewStatus === 'pending'
}
