import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import type { Actor } from '@/common/auth/auth.types'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { chapters, follows, stories, storyStats } from '@/infra/database/schema'
import { cardUpdatedAt } from '@/modules/stories/story-columns'
import { isVisibleStory } from '@/modules/stories/story-conditions'
import type { LibraryRow } from '../library.types'

/** Số chương đã xuất bản sau mốc "đã thấy" của dòng follows đang xét */
const newChapters = sql<number>`(
  select count(*) from ${chapters}
  where ${chapters.storyId} = ${follows.storyId}
    and ${chapters.status} = 'published'
    and ${chapters.number} > ${follows.seenChapter}
)`

/** Nơi duy nhất truy vấn follows. Mốc "đã thấy" và số người theo dõi do trigger của DB ghi */
@Injectable()
export class FollowsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async isFollowing(userId: string, storyId: string, ex: Executor = this.db) {
    const [row] = await ex
      .select({ storyId: follows.storyId })
      .from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.storyId, storyId)))
      .limit(1)
    return row !== undefined
  }

  /** Theo dõi; đã theo dõi rồi thì thôi (không đổi mốc, không đếm thêm) */
  async follow(userId: string, storyId: string, ex: Executor = this.db) {
    await ex.insert(follows).values({ userId, storyId }).onConflictDoNothing()
  }

  async unfollow(userId: string, storyId: string, ex: Executor = this.db) {
    await ex.delete(follows).where(and(eq(follows.userId, userId), eq(follows.storyId, storyId)))
  }

  /**
   * Truyện người gọi đang theo dõi và còn xem được (như get_library của Supabase): truyện có chương
   * mới trước, rồi truyện mới cập nhật
   */
  async library(actor: Actor, ex: Executor = this.db): Promise<LibraryRow[]> {
    return ex
      .select({
        storyId: follows.storyId,
        followedAt: follows.followedAt,
        seenChapter: follows.seenChapter,
        newChapters: newChapters.mapWith(Number),
      })
      .from(follows)
      .innerJoin(stories, eq(stories.id, follows.storyId))
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
      .where(and(eq(follows.userId, actor.id), isVisibleStory(actor)))
      .orderBy(desc(sql`${newChapters} > 0`), desc(cardUpdatedAt), desc(follows.storyId))
  }

  /** Số truyện trong tủ truyện có chương mới (như library_update_count) */
  async updateCount(actor: Actor, ex: Executor = this.db) {
    const [row] = await ex
      .select({ total: count() })
      .from(follows)
      .innerJoin(stories, eq(stories.id, follows.storyId))
      .where(and(eq(follows.userId, actor.id), isVisibleStory(actor), sql`${newChapters} > 0`))
    return row!.total
  }
}
