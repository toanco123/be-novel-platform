// Ghi lượt đọc (như private.record_chapter_view của Supabase): chỉ chương đã xuất bản của truyện đang
// công khai, không tính chủ truyện, mỗi người (khách: mỗi IP) 1 lượt / chương / ngày giờ Việt Nam.
// Chống đếm lặp bằng khóa Redis sống 2 ngày thay bảng private.chapter_view_log.
import { Inject, Injectable } from '@nestjs/common'
import type { Redis } from 'ioredis'
import type { Actor } from '@/common/auth/auth.types'
import { AppException } from '@/common/errors/app.exception'
import { vietnamDate } from '@/common/utils/vietnam-date'
import { DB } from '@/infra/database/database.constants'
import type { Db } from '@/infra/database/database.types'
import { REDIS } from '@/infra/redis/redis.constants'
import { StoriesRepository } from '@/modules/stories/stories.repository'
import { canViewStory } from '@/modules/stories/stories.rules'
import { viewerKey, viewSeenKey } from '../chapter-view-keys'
import { VIEW_SEEN_TTL_SECONDS } from '../chapters.constants'
import { ChapterViewsRepository } from '../repositories/chapter-views.repository'
import { ChaptersRepository } from '../repositories/chapters.repository'

@Injectable()
export class ChapterViewsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly stories: StoriesRepository,
    private readonly chapters: ChaptersRepository,
    private readonly views: ChapterViewsRepository,
  ) {}

  /**
   * Người gọi đọc chương `number`. Chương không đọc được → not_found; lượt không được tính (lặp trong
   * ngày, chủ truyện, truyện chưa công khai) thì bỏ qua, không báo lỗi
   */
  async record(slug: string, number: number, actor: Actor | undefined, ip: string | null) {
    const story = await this.stories.findAccessBySlug(slug)
    if (
      !story ||
      !canViewStory(story, actor) ||
      !(await this.chapters.isPublished(story.id, number))
    ) {
      throw new AppException('not_found')
    }
    if (story.visibility !== 'published' || actor?.id === story.ownerId) return

    const day = vietnamDate()
    const key = viewSeenKey(day, story.id, number, viewerKey(actor, ip))
    const fresh = await this.redis.set(key, '1', 'EX', VIEW_SEEN_TTL_SECONDS, 'NX')
    if (fresh !== 'OK') return
    try {
      await this.db.transaction((tx) =>
        this.views.add({ storyId: story.id, chapterNumber: number, day }, tx),
      )
    } catch (error) {
      // Chưa ghi được thì bỏ đánh dấu để lần mở sau tính lại; lỗi của Redis không che lỗi gốc
      await this.redis.del(key).catch(() => undefined)
      throw error
    }
  }
}
