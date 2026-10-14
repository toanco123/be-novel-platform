import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Actor } from '@/common/auth/auth.types'
import { DB } from '@/infra/database/database.constants'
import type { Db, Executor } from '@/infra/database/database.types'
import { readingHistory, stories } from '@/infra/database/schema'
import { isVisibleStory } from '@/modules/stories/story-conditions'
import type { GuestHistoryEntry, HistoryRow, ProgressRow, SaveProgressInput } from './library.types'

const progressColumns = {
  chapterNumber: readingHistory.chapterNumber,
  chapterTitle: readingHistory.chapterTitle,
  progress: readingHistory.progress,
  readAt: readingHistory.readAt,
}

/** Nơi duy nhất truy vấn reading_history */
@Injectable()
export class HistoryRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Ghi chỗ đọc dở (như save_reading_progress của Supabase). `progress` không có thì giữ tiến độ cũ
   * nếu vẫn chương đó, đổi chương thì về 0
   */
  async save(
    userId: string,
    storyId: string,
    { chapter, chapterTitle, progress }: SaveProgressInput,
    ex: Executor = this.db,
  ): Promise<ProgressRow> {
    const [row] = await ex
      .insert(readingHistory)
      .values({
        userId,
        storyId,
        chapterNumber: chapter,
        chapterTitle,
        progress: progress ?? 0,
        readAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [readingHistory.userId, readingHistory.storyId],
        set: {
          chapterNumber: sql`excluded.chapter_number`,
          chapterTitle: sql`excluded.chapter_title`,
          progress:
            progress === undefined
              ? sql`case when ${readingHistory.chapterNumber} = excluded.chapter_number then ${readingHistory.progress} else excluded.progress end`
              : sql`excluded.progress`,
          readAt: sql`excluded.read_at`,
        },
      })
      .returning(progressColumns)
    return row!
  }

  async find(userId: string, storyId: string, ex: Executor = this.db): Promise<ProgressRow | null> {
    const [row] = await ex
      .select(progressColumns)
      .from(readingHistory)
      .where(and(eq(readingHistory.userId, userId), eq(readingHistory.storyId, storyId)))
      .limit(1)
    return row ?? null
  }

  /** Lịch sử của người gọi, mới đọc trước; chỉ truyện người đó còn xem được */
  async list(actor: Actor, limit: number, ex: Executor = this.db): Promise<HistoryRow[]> {
    return ex
      .select({ storyId: readingHistory.storyId, slug: stories.slug, ...progressColumns })
      .from(readingHistory)
      .innerJoin(stories, eq(stories.id, readingHistory.storyId))
      .where(and(eq(readingHistory.userId, actor.id), isVisibleStory(actor)))
      .orderBy(desc(readingHistory.readAt), desc(readingHistory.storyId))
      .limit(limit)
  }

  /** Xóa một truyện khỏi lịch sử (chưa có thì thôi) */
  async remove(userId: string, slug: string, ex: Executor = this.db) {
    await ex
      .delete(readingHistory)
      .where(
        and(
          eq(readingHistory.userId, userId),
          inArray(
            readingHistory.storyId,
            ex.select({ id: stories.id }).from(stories).where(eq(stories.slug, slug)),
          ),
        ),
      )
  }

  async clear(userId: string, ex: Executor = this.db) {
    await ex.delete(readingHistory).where(eq(readingHistory.userId, userId))
  }

  /**
   * Gộp lịch sử lúc còn là khách (như merge_guest_history của Supabase): mỗi truyện lấy dòng đọc
   * mới nhất, chỉ ghi đè khi mới hơn dòng đang có; slug không có hoặc truyện không xem được thì bỏ qua
   */
  async merge(actor: Actor, entries: GuestHistoryEntry[], ex: Executor = this.db) {
    if (!entries.length) return
    // Khóa JSON trùng tên cột khai báo của jsonb_to_recordset
    const rows = entries.map((e) => ({
      slug: e.slug,
      chapter: e.chapter,
      chapter_title: e.chapterTitle,
      progress: e.progress,
      read_at: e.readAt,
    }))
    await ex.execute(sql`
      insert into ${readingHistory} as h
        (user_id, story_id, chapter_number, chapter_title, progress, read_at)
      select distinct on (${stories.id})
        ${actor.id}::uuid, ${stories.id}, e.chapter, e.chapter_title, e.progress, e.read_at
      from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
        as e(slug text, chapter integer, chapter_title text, progress real, read_at timestamptz)
      join ${stories} on ${stories.slug} = e.slug
      where ${isVisibleStory(actor)}
      order by ${stories.id}, e.read_at desc
      on conflict (user_id, story_id) do update set
        chapter_number = excluded.chapter_number,
        chapter_title = excluded.chapter_title,
        progress = excluded.progress,
        read_at = excluded.read_at
      where excluded.read_at > h.read_at
    `)
  }
}
