import { Inject, Injectable } from '@nestjs/common'
import { asc, count, eq, like, sql } from 'drizzle-orm'
import type { PageWindow } from '@/common/pagination/pagination.types'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { genres, profiles, stories, storyGenres, storyStats } from '@/infra/database/schema'
import { isPublicStory } from '@/modules/stories/public-story'
import type { GenreWithCreator, NewGenre } from './genres.types'

/** Nơi duy nhất truy vấn bảng genres */
@Injectable()
export class GenresRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Thứ tự như web: thể loại có sẵn (không có người tạo) trước, rồi thể loại người dùng tạo theo thời
   * gian tạo, cùng lúc thì theo tên. `slugPart` (đã slugify, chỉ có [a-z0-9-]): chỉ thể loại có slug
   * chứa chuỗi này
   */
  async list(
    { offset, limit }: PageWindow,
    slugPart?: string,
    ex: Executor = this.db,
  ): Promise<GenreWithCreator[]> {
    return this.selectWithCreator(ex)
      .where(this.slugContains(slugPart))
      .orderBy(sql`${genres.createdBy} is not null`, asc(genres.createdAt), asc(genres.name))
      .limit(limit)
      .offset(offset)
  }

  async count(slugPart?: string, ex: Executor = this.db) {
    const [row] = await ex
      .select({ total: count() })
      .from(genres)
      .where(this.slugContains(slugPart))
    return row!.total
  }

  async findBySlug(slug: string, ex: Executor = this.db): Promise<GenreWithCreator | null> {
    const [row] = await this.selectWithCreator(ex).where(eq(genres.slug, slug)).limit(1)
    return row ?? null
  }

  /** Trùng slug: lỗi 23505 genres_pkey (→ genre_exists) */
  async insert(genre: NewGenre, ex: Executor = this.db) {
    await ex.insert(genres).values(genre)
  }

  private selectWithCreator(ex: Executor) {
    return ex
      .select({
        slug: genres.slug,
        name: genres.name,
        description: genres.description,
        createdBy: genres.createdBy,
        createdAt: genres.createdAt,
        createdByName: profiles.displayName,
        storyCount: sql<number>`(
          select count(*) from ${storyGenres}
          join ${stories} on ${stories.id} = ${storyGenres.storyId}
          join ${storyStats} on ${storyStats.storyId} = ${stories.id}
          where ${storyGenres.genreSlug} = ${genres.slug} and ${isPublicStory()}
        )`.mapWith(Number),
      })
      .from(genres)
      .leftJoin(profiles, eq(profiles.id, genres.createdBy))
  }

  private slugContains(slugPart: string | undefined) {
    return slugPart === undefined ? undefined : like(genres.slug, `%${slugPart}%`)
  }
}
