import { Inject, Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { genres, profiles, stories, storyGenres, storyStats } from '@/infra/database/schema'
import { CARD_DESCRIPTION_LENGTH } from './stories.constants'
import type { StoryAccessRow, StoryCardRow, StoryGenreRef } from './stories.types'

/** Nơi duy nhất truy vấn stories, story_stats, story_genres cho người đọc (module khác dùng qua export) */
@Injectable()
export class StoriesRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Thẻ truyện theo slug, mô tả đầy đủ. Không xét quyền xem (service xét) */
  async findBySlug(slug: string, ex: Executor = this.db): Promise<StoryCardRow | null> {
    const [row] = await this.selectCards(ex, { fullDescription: true })
      .where(eq(stories.slug, slug))
      .limit(1)
    return row ?? null
  }

  /** Truyện theo slug, chỉ các cột để xét quyền xem */
  async findAccessBySlug(slug: string, ex: Executor = this.db): Promise<StoryAccessRow | null> {
    const [row] = await ex
      .select({
        id: stories.id,
        visibility: stories.visibility,
        ownerId: stories.ownerId,
        reviewStatus: stories.reviewStatus,
      })
      .from(stories)
      .where(eq(stories.slug, slug))
      .limit(1)
    return row ?? null
  }

  /**
   * Thẻ truyện (tương đương view story_cards của Supabase): truyện + tên chủ truyện + số liệu + thể
   * loại theo thứ tự tác giả chọn. Danh sách chỉ lấy đoạn đầu mô tả
   */
  private selectCards(ex: Executor, { fullDescription }: { fullDescription: boolean }) {
    return ex
      .select({
        id: stories.id,
        slug: stories.slug,
        title: stories.title,
        description: fullDescription
          ? stories.description
          : sql<string>`left(${stories.description}, ${CARD_DESCRIPTION_LENGTH})`,
        status: stories.status,
        visibility: stories.visibility,
        ownerId: stories.ownerId,
        reviewStatus: stories.reviewStatus,
        authorName: stories.authorName,
        ownerName: profiles.displayName,
        coverPath: stories.coverPath,
        coverThumbPath: stories.coverThumbPath,
        genres: sql<StoryGenreRef[]>`coalesce((
          select jsonb_agg(
            jsonb_build_object('slug', ${genres.slug}, 'name', ${genres.name}, 'description', ${genres.description})
            order by ${storyGenres.position}, ${genres.name}
          )
          from ${storyGenres}
          join ${genres} on ${genres.slug} = ${storyGenres.genreSlug}
          where ${storyGenres.storyId} = ${stories.id}
        ), '[]'::jsonb)`,
        chapterCount: storyStats.chapterCount,
        firstChapterNumber: storyStats.firstChapterNumber,
        latestChapterNumber: storyStats.latestChapterNumber,
        latestChapterTitle: storyStats.latestChapterTitle,
        nextChapterNumber: storyStats.nextChapterNumber,
        nextChapterAt: storyStats.nextChapterAt,
        viewCount: storyStats.viewCount,
        followerCount: storyStats.followerCount,
        ratingAvg: sql<number>`${storyStats.ratingAvg}`.mapWith(Number),
        ratingCount: sql<number>`${storyStats.ratingCount}`.mapWith(Number),
        ratingCounts: storyStats.ratingCounts,
        createdAt: sql<Date>`coalesce(${stories.publishedAt}, ${stories.createdAt})`.mapWith(
          stories.createdAt,
        ),
        updatedAt:
          sql<Date>`greatest(${storyStats.lastChapterAt}, ${stories.publishedAt}, ${stories.createdAt})`.mapWith(
            stories.updatedAt,
          ),
      })
      .from(stories)
      .innerJoin(profiles, eq(profiles.id, stories.ownerId))
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
  }
}
