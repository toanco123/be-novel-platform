import { Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import type { Executor } from '@/infra/database/database.types'
import { chapterViews, storyStats } from '@/infra/database/schema'
import type { ChapterViewInput } from '../chapters.types'

/** Nơi duy nhất ghi chapter_views và lượt đọc của story_stats */
@Injectable()
export class ChapterViewsRepository {
  /** +1 lượt đọc của chương trong ngày và +1 tổng lượt đọc của truyện (gọi trong transaction) */
  async add({ storyId, chapterNumber, day }: ChapterViewInput, tx: Executor) {
    await tx
      .insert(chapterViews)
      .values({ storyId, chapterNumber, day, views: 1 })
      .onConflictDoUpdate({
        target: [chapterViews.storyId, chapterViews.chapterNumber, chapterViews.day],
        set: { views: sql`${chapterViews.views} + 1` },
      })
    await tx
      .update(storyStats)
      .set({ viewCount: sql`${storyStats.viewCount} + 1` })
      .where(eq(storyStats.storyId, storyId))
  }
}
