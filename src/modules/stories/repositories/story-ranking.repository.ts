// Xếp hạng truyện công khai có chương (như story_ranking, related_stories của Supabase). Chỉ trả id và
// giá trị theo thứ tự; thẻ truyện lấy sau bằng StoriesRepository.cardsByIds.
import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { chapterViews, stories, storyGenres, storyStats } from '@/infra/database/schema'
import { isPublicStory } from '../public-story'
import { RANKING_PERIOD_DAYS, RATING_PRIOR } from '../stories.constants'
import type { RankedStoryRow, RankingCriterion, RankingPeriod } from '../stories.types'

const mine = alias(storyGenres, 'mine')
const other = alias(storyGenres, 'other')

@Injectable()
export class StoryRankingRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async ranking(
    by: RankingCriterion,
    period: RankingPeriod,
    limit: number,
    ex: Executor = this.db,
  ): Promise<RankedStoryRow[]> {
    if (by === 'rating') return this.byRating(limit, ex)
    if (by === 'follows') return this.byStat('follows', limit, ex)
    if (period === 'all') return this.byStat('views', limit, ex)
    return this.viewsInPeriod(RANKING_PERIOD_DAYS[period], limit, ex)
  }

  /**
   * Truyện liên quan của truyện `storyId`: nhiều thể loại trùng nhất, rồi nhiều lượt đọc nhất; bỏ truyện
   * cùng chủ truyện
   */
  async related(storyId: string, ownerId: string, limit: number, ex: Executor = this.db) {
    const rows = await ex
      .select({ storyId: stories.id })
      .from(mine)
      .innerJoin(other, and(eq(other.genreSlug, mine.genreSlug), ne(other.storyId, mine.storyId)))
      .innerJoin(stories, eq(stories.id, other.storyId))
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
      .where(and(eq(mine.storyId, storyId), ne(stories.ownerId, ownerId), isPublicStory()))
      .groupBy(stories.id, storyStats.viewCount)
      .orderBy(desc(count()), desc(storyStats.viewCount), asc(stories.id))
      .limit(limit)
    return rows.map((row) => row.storyId)
  }

  /** Tổng lượt đọc của `days` ngày gần nhất theo giờ Việt Nam (tính cả hôm nay) */
  private async viewsInPeriod(days: number, limit: number, ex: Executor) {
    const total = sql<number>`sum(${chapterViews.views})`
    return ex
      .select({ storyId: chapterViews.storyId, value: total.mapWith(Number) })
      .from(chapterViews)
      .innerJoin(stories, eq(stories.id, chapterViews.storyId))
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
      .where(
        and(
          sql`${chapterViews.day} > (now() at time zone 'Asia/Ho_Chi_Minh')::date - ${days}::integer`,
          isPublicStory(),
        ),
      )
      .groupBy(chapterViews.storyId)
      .orderBy(desc(total), asc(chapterViews.storyId))
      .limit(limit)
  }

  /** Theo một cột số liệu (> 0): tổng lượt đọc hoặc số người theo dõi */
  private async byStat(stat: 'views' | 'follows', limit: number, ex: Executor) {
    const column = stat === 'views' ? storyStats.viewCount : storyStats.followerCount
    return ex
      .select({ storyId: stories.id, value: sql<number>`${column}`.mapWith(Number) })
      .from(stories)
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
      .where(and(isPublicStory(), gt(column, 0)))
      .orderBy(desc(column), asc(stories.id))
      .limit(limit)
  }

  /**
   * Theo điểm có trọng số (thêm RATING_PRIOR lượt chấm "ảo" bằng điểm trung bình của mọi truyện có
   * lượt chấm); giá trị trả về là điểm trung bình thật
   */
  private async byRating(limit: number, ex: Executor) {
    const mean = sql`(
      select coalesce(avg(${storyStats.ratingAvg}), 0)
      from ${stories} join ${storyStats} on ${storyStats.storyId} = ${stories.id}
      where ${isPublicStory()} and ${storyStats.ratingCount} > 0
    )`
    const weighted = sql`(${storyStats.ratingSum} + ${mean} * ${RATING_PRIOR}) / (${storyStats.ratingCount} + ${RATING_PRIOR})`
    return ex
      .select({ storyId: stories.id, value: sql<number>`${storyStats.ratingAvg}`.mapWith(Number) })
      .from(stories)
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
      .where(and(isPublicStory(), gt(storyStats.ratingCount, 0)))
      .orderBy(desc(weighted), asc(stories.id))
      .limit(limit)
  }
}
