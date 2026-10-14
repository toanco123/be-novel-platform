// Báo cáo bình luận vi phạm: đúng định nghĩa bảng private.comment_reports của Supabase (BE chỉ có
// một schema). Ghi qua CommentReportsService (như RPC report_comment); quản trị viên xử lý ở đợt
// Quản trị.
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { comments } from './comments'
import { profiles } from './profiles'
import { commentReportReason, reportStatus } from './report-enums'

export const commentReports = pgTable(
  'comment_reports',
  {
    id: uuid().primaryKey().defaultRandom(),
    commentId: uuid().notNull(),
    reporterId: uuid().notNull(),
    reason: commentReportReason().notNull(),
    note: text().notNull().default(''),
    status: reportStatus().notNull().default('open'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp({ withTimezone: true }),
    /** Nội dung bình luận lúc bị báo cáo; null: báo cáo tạo trước khi có cột này (Supabase) */
    contentSnapshot: text(),
  },
  (t) => [
    foreignKey({
      name: 'comment_reports_comment_id_fkey',
      columns: [t.commentId],
      foreignColumns: [comments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'comment_reports_reporter_id_fkey',
      columns: [t.reporterId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    check('comment_reports_note_check', sql`char_length(${t.note}) <= 500`),
    check('comment_reports_check', sql`${t.reason} <> 'other' or ${t.note} <> ''`),
    check('comment_reports_content_snapshot_check', sql`char_length(${t.contentSnapshot}) <= 1000`),
    uniqueIndex('comment_reports_open_unique')
      .on(t.reporterId, t.commentId)
      .where(sql`${t.status} = 'open'`),
    index('comment_reports_comment_id_status_idx').on(t.commentId, t.status),
    index('comment_reports_reporter_id_created_at_idx').on(
      t.reporterId,
      t.createdAt.desc().nullsFirst(),
    ),
  ],
)
