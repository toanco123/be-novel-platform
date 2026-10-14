// Kiểu enum của báo cáo: giá trị giống Supabase (migration init_extensions_profiles,
// comment_replies_and_reports).
import { pgEnum } from 'drizzle-orm/pg-core'

/** Trạng thái báo cáo bình luận / báo lỗi chương */
export const reportStatus = pgEnum('report_status', ['open', 'resolved'])

/** Lý do báo cáo một bình luận vi phạm */
export const commentReportReason = pgEnum('comment_report_reason', [
  'spam',
  'offensive',
  'spoiler',
  'other',
])
