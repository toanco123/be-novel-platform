// Chấm điểm truyện: mỗi người một điểm cho mỗi truyện. Chỉ chấm truyện đang công khai (như policy
// ratings_insert_own của Supabase); chấm cần xác nhận email (controller), xóa điểm luôn được.
import { Injectable } from '@nestjs/common'
import type { Actor } from '@/common/auth/auth.types'
import { StoryAccessService } from '@/modules/stories/services/story-access.service'
import type { MyRatingDto } from './dto/my-rating.dto'
import { RatingsRepository } from './ratings.repository'

@Injectable()
export class RatingsService {
  constructor(
    private readonly ratings: RatingsRepository,
    private readonly access: StoryAccessService,
  ) {}

  async mine(actor: Actor, slug: string): Promise<MyRatingDto> {
    const story = await this.access.visible(slug, actor)
    return { score: await this.ratings.find(actor.id, story.id) }
  }

  /** Truyện xem được mà chưa công khai → story_not_public */
  async rate(actor: Actor, slug: string, score: number): Promise<MyRatingDto> {
    const story = await this.access.public(slug, actor)
    await this.ratings.upsert(actor.id, story.id, score)
    return { score }
  }

  /** Xóa được cả điểm của truyện đã bị ẩn (truyện vẫn phải còn) */
  async remove(actor: Actor, slug: string) {
    const story = await this.access.existing(slug)
    await this.ratings.remove(actor.id, story.id)
  }
}
