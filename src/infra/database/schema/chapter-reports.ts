// Báo lỗi chương: đúng định nghĩa bảng chapter_reports của Supabase, trừ default auth.uid() của
// reporter_id. Người đọc gửi qua ChapterReportsService (như RPC report_chapter); chủ truyện xử lý ở
// đợt Sáng tác.
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { chapters } from './chapters'
import { profiles } from './profiles'
import { reportReason, reportStatus } from './report-enums'

export const chapterReports = pgTable(
  'chapter_reports',
  {
    id: uuid().primaryKey().defaultRandom(),
    storyId: uuid().notNull(),
    chapterNumber: integer().notNull(),
    reporterId: uuid().notNull(),
    reason: reportReason().notNull(),
    note: text().notNull().default(''),
    status: reportStatus().notNull().default('open'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: 'chapter_reports_story_id_chapter_number_fkey',
      columns: [t.storyId, t.chapterNumber],
      foreignColumns: [chapters.storyId, chapters.number],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'chapter_reports_reporter_id_fkey',
      columns: [t.reporterId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    check('chapter_reports_note_check', sql`char_length(${t.note}) <= 500`),
    check('chapter_reports_check', sql`${t.reason} <> 'other' or ${t.note} <> ''`),
    // Cùng người, cùng chương, cùng lý do mà báo lỗi cũ chưa xử lý thì chỉ cập nhật ghi chú
    uniqueIndex('chapter_reports_open_unique')
      .on(t.reporterId, t.storyId, t.chapterNumber, t.reason)
      .where(sql`${t.status} = 'open'`),
    index('chapter_reports_story_status_created_idx').on(
      t.storyId,
      t.status,
      t.createdAt.desc().nullsFirst(),
    ),
    index('chapter_reports_reporter_id_idx').on(t.reporterId),
    index('chapter_reports_story_chapter_idx').on(t.storyId, t.chapterNumber),
  ],
)
