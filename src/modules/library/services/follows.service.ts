// Theo dõi truyện. Theo dõi cần xác nhận email (làm đổi số người theo dõi); bỏ theo dõi luôn được.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { StoryAccessService } from '@/modules/stories/services/story-access.service'
import type { FollowStatusDto } from '../dto/follow-status.dto'
import { FollowsRepository } from '../repositories/follows.repository'

@Injectable()
export class FollowsService {
  constructor(
    private readonly follows: FollowsRepository,
    private readonly access: StoryAccessService,
  ) {}

  async status(actor: Actor, slug: string): Promise<FollowStatusDto> {
    const story = await this.access.visible(slug, actor)
    return { following: await this.follows.isFollowing(actor.id, story.id) }
  }

  /** Theo dõi truyện xem được (như policy follows_insert_own); đã theo dõi thì thôi */
  async follow(actor: Actor, slug: string) {
    const story = await this.access.visible(slug, actor)
    await this.follows.follow(actor.id, story.id)
  }

  /** Bỏ theo dõi được cả truyện đã bị ẩn (truyện vẫn phải còn) */
  async unfollow(actor: Actor, slug: string) {
    const story = await this.access.existing(slug)
    await this.follows.unfollow(actor.id, story.id)
  }
}
