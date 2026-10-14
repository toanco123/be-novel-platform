// Số liệu của truyện: đúng định nghĩa bảng story_stats của Supabase. Dòng tạo cùng truyện và các cột
// về chương do trigger tính (migration 0009_catalog_triggers); lượt đọc, theo dõi, chấm điểm, đề cử
// do service ghi.
import { type SQL, sql } from 'drizzle-orm'
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { stories } from './stories'

/** Tổng số lượt chấm 1..5 sao (biểu thức của cột sinh, như Supabase) */
const ratingTotal = (counts: SQL) =>
  sql`${counts}[1] + ${counts}[2] + ${counts}[3] + ${counts}[4] + ${counts}[5]`
const ratingWeighted = (counts: SQL) =>
  sql`${counts}[1] + 2 * ${counts}[2] + 3 * ${counts}[3] + 4 * ${counts}[4] + 5 * ${counts}[5]`

export const storyStats = pgTable(
  'story_stats',
  {
    storyId: uuid().primaryKey(),
    // Các cột về chương chỉ tính chương đã xuất bản
    chapterCount: integer().notNull().default(0),
    firstChapterNumber: integer(),
    latestChapterNumber: integer(),
    latestChapterTitle: text(),
    lastChapterAt: timestamp({ withTimezone: true }),
    viewCount: bigint({ mode: 'number' }).notNull().default(0),
    followerCount: integer().notNull().default(0),
    /** Số lượt chấm 1..5 sao */
    ratingCounts: integer()
      .array()
      .notNull()
      .default(sql`'{0,0,0,0,0}'`),
    ratingCount: integer().generatedAlwaysAs((): SQL => ratingTotal(sql`rating_counts`)),
    ratingSum: integer().generatedAlwaysAs((): SQL => ratingWeighted(sql`rating_counts`)),
    /** 0 khi chưa có lượt chấm nào */
    ratingAvg: numeric({ precision: 3, scale: 2, mode: 'number' }).generatedAlwaysAs(
      (): SQL =>
        sql`case when ${ratingTotal(sql`rating_counts`)} = 0 then 0 else round((${ratingWeighted(sql`rating_counts`)})::numeric / (${ratingTotal(sql`rating_counts`)}), 2) end`,
    ),
    /** Chương nháp có giờ hẹn sớm nhất */
    nextChapterNumber: integer(),
    nextChapterAt: timestamp({ withTimezone: true }),
    voteCount: bigint({ mode: 'number' }).notNull().default(0),
  },
  (t) => [
    foreignKey({
      name: 'story_stats_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    check('story_stats_rating_counts_check', sql`cardinality(${t.ratingCounts}) = 5`),
    index('story_stats_last_chapter_at_idx').on(t.lastChapterAt.desc().nullsFirst()),
    index('story_stats_view_count_idx').on(t.viewCount.desc().nullsFirst()),
  ],
)
