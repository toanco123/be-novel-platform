import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { ratings } from '@/infra/database/schema'

/** Nơi duy nhất truy vấn ratings. Phân bố sao của truyện do trigger ratings_count ghi */
@Injectable()
export class RatingsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async find(userId: string, storyId: string, ex: Executor = this.db) {
    const [row] = await ex
      .select({ score: ratings.score })
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.storyId, storyId)))
      .limit(1)
    return row?.score ?? null
  }

  /** Chấm hoặc chấm lại (thay điểm cũ) */
  async upsert(userId: string, storyId: string, score: number, ex: Executor = this.db) {
    await ex
      .insert(ratings)
      .values({ userId, storyId, score })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.storyId],
        set: { score: sql`excluded.score` },
      })
  }

  async remove(userId: string, storyId: string, ex: Executor = this.db) {
    await ex.delete(ratings).where(and(eq(ratings.userId, userId), eq(ratings.storyId, storyId)))
  }
}
