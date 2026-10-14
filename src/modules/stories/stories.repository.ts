import { Inject, Injectable } from '@nestjs/common'
import { and, asc, between, count, desc, eq, gt, lt, type SQL, sql } from 'drizzle-orm'
import type { PageWindow } from '@/common/pagination/pagination.types'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import {
  curatedStories,
  genres,
  profiles,
  stories,
  storyGenres,
  storyStats,
} from '@/infra/database/schema'
import { isPublicStory } from './public-story'
import {
  CARD_DESCRIPTION_LENGTH,
  LONG_STORY_MIN_CHAPTERS,
  SHORT_STORY_MAX_CHAPTERS,
} from './stories.constants'
import type {
  AuthorRef,
  CuratedList,
  StoryAccessRow,
  StoryCardRow,
  StoryGenreRef,
  StoryListFilter,
  StoryLength,
  StorySort,
} from './stories.types'

/** createdAt của thẻ truyện: lần đầu công khai, chưa công khai thì lúc tạo (như story_cards) */
const cardCreatedAt = sql<Date>`coalesce(${stories.publishedAt}, ${stories.createdAt})`
/** updatedAt của thẻ truyện: mới nhất trong chương xuất bản gần nhất, lần đầu công khai, lúc tạo */
const cardUpdatedAt = sql<Date>`greatest(${storyStats.lastChapterAt}, ${stories.publishedAt}, ${stories.createdAt})`

/** Thứ tự (giảm dần) của từng kiểu sắp xếp; cuối cùng luôn theo id để phân trang ổn định */
const SORT_ORDER: Record<StorySort, SQL[]> = {
  updated: [desc(cardUpdatedAt)],
  views: [desc(storyStats.viewCount), desc(cardUpdatedAt)],
  rating: [desc(storyStats.ratingAvg), desc(storyStats.ratingCount), desc(cardCreatedAt)],
  newest: [desc(cardCreatedAt)],
}

const LENGTH_FILTER: Record<StoryLength, SQL> = {
  short: lt(storyStats.chapterCount, SHORT_STORY_MAX_CHAPTERS + 1),
  medium: between(
    storyStats.chapterCount,
    SHORT_STORY_MAX_CHAPTERS + 1,
    LONG_STORY_MIN_CHAPTERS - 1,
  ),
  long: gt(storyStats.chapterCount, LONG_STORY_MIN_CHAPTERS - 1),
}

/** Cùng chủ truyện và cùng bút danh; không bút danh (hoặc bút danh có slug rỗng) là một nhóm */
const sameAuthor = ({ ownerId, authorKey }: AuthorRef) =>
  and(
    eq(stories.ownerId, ownerId),
    authorKey
      ? sql`slugify(${stories.authorName}) = ${authorKey}`
      : sql`(${stories.authorName} is null or slugify(${stories.authorName}) = '')`,
  )!

const hasGenre = (slug: string) =>
  sql`exists (select 1 from ${storyGenres} where ${storyGenres.storyId} = ${stories.id} and ${storyGenres.genreSlug} = ${slug})`

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

  /** Một trang truyện công khai có chương, theo bộ lọc */
  async list(
    filter: StoryListFilter,
    { offset, limit }: PageWindow,
    ex: Executor = this.db,
  ): Promise<StoryCardRow[]> {
    return this.selectCards(ex, { fullDescription: false })
      .where(this.listWhere(filter))
      .orderBy(...SORT_ORDER[filter.sort], asc(stories.id))
      .limit(limit)
      .offset(offset)
  }

  async count(filter: StoryListFilter, ex: Executor = this.db) {
    const [row] = await ex
      .select({ total: count() })
      .from(stories)
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
      .where(this.listWhere(filter))
    return row!.total
  }

  /** Truyện chọn tay của danh sách `list` theo vị trí, chỉ truyện công khai có chương */
  async curated(list: CuratedList, ex: Executor = this.db): Promise<StoryCardRow[]> {
    return this.selectCards(ex, { fullDescription: false })
      .innerJoin(
        curatedStories,
        and(eq(curatedStories.storyId, stories.id), eq(curatedStories.list, list)),
      )
      .where(isPublicStory())
      .orderBy(asc(curatedStories.position), asc(curatedStories.storyId))
  }

  private listWhere({ status, genre, length, author }: StoryListFilter) {
    return and(
      isPublicStory(),
      status ? eq(stories.status, status) : undefined,
      genre ? hasGenre(genre) : undefined,
      length ? LENGTH_FILTER[length] : undefined,
      author ? sameAuthor(author) : undefined,
    )
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
        createdAt: cardCreatedAt.mapWith(stories.createdAt),
        updatedAt: cardUpdatedAt.mapWith(stories.updatedAt),
      })
      .from(stories)
      .innerJoin(profiles, eq(profiles.id, stories.ownerId))
      .innerJoin(storyStats, eq(storyStats.storyId, stories.id))
  }
}
