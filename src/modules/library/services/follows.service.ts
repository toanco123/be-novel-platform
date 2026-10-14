// Theo dõi truyện. Theo dõi cần xác nhận email (làm đổi số người theo dõi); bỏ theo dõi luôn được.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { StoriesRepository } from '@/modules/stories/repositories/stories.repository'
import { canViewStory } from '@/modules/stories/stories.rules'
import type { FollowStatusDto } from '../dto/follow-status.dto'
import { FollowsRepository } from '../repositories/follows.repository'

@Injectable()
export class FollowsService {
  constructor(
    private readonly follows: FollowsRepository,
    private readonly stories: StoriesRepository,
  ) {}

  async status(actor: Actor, slug: string): Promise<FollowStatusDto> {
    const storyId = await this.visibleStoryId(actor, slug)
    return { following: await this.follows.isFollowing(actor.id, storyId) }
  }

  /** Theo dõi truyện xem được (như policy follows_insert_own); đã theo dõi thì thôi */
  async follow(actor: Actor, slug: string) {
    await this.follows.follow(actor.id, await this.visibleStoryId(actor, slug))
  }

  /** Bỏ theo dõi được cả truyện đã bị ẩn (truyện vẫn phải còn) */
  async unfollow(actor: Actor, slug: string) {
    const story = await this.stories.findAccessBySlug(slug)
    if (!story) throw new AppException('not_found')
    await this.follows.unfollow(actor.id, story.id)
  }

  private async visibleStoryId(actor: Actor, slug: string) {
    const story = await this.stories.findAccessBySlug(slug)
    if (!story || !canViewStory(story, actor)) throw new AppException('not_found')
    return story.id
  }
}
