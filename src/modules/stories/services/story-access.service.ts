// Tìm truyện theo slug và xét quyền của người gọi, dùng chung cho các module đọc / ghi theo truyện
// (chương, lịch sử, theo dõi, chấm điểm, bình luận...).
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { StoriesRepository } from '../repositories/stories.repository'
import { canViewStory } from '../stories.rules'
import type { StoryAccessRow } from '../stories.types'

@Injectable()
export class StoryAccessService {
  constructor(private readonly stories: StoriesRepository) {}

  /** Truyện người gọi xem được; không có hoặc không xem được → not_found (không lộ truyện nháp) */
  async visible(slug: string, actor: Actor | undefined): Promise<StoryAccessRow> {
    const story = await this.stories.findAccessBySlug(slug)
    if (!story || !canViewStory(story, actor)) throw new AppException('not_found')
    return story
  }

  /**
   * Truyện để ghi thứ người khác thấy (chấm điểm, bình luận...): phải xem được và đang công khai.
   * Xem được mà chưa công khai (chủ truyện xem trước, quản trị viên xem truyện chờ duyệt) →
   * story_not_public
   */
  async public(slug: string, actor: Actor | undefined): Promise<StoryAccessRow> {
    const story = await this.visible(slug, actor)
    if (story.visibility !== 'published') throw new AppException('story_not_public')
    return story
  }

  /** Truyện còn tồn tại (không xét quyền xem), vd để bỏ theo dõi truyện đã bị ẩn */
  async existing(slug: string): Promise<StoryAccessRow> {
    const story = await this.stories.findAccessBySlug(slug)
    if (!story) throw new AppException('not_found')
    return story
  }
}
