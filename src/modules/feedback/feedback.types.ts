import type { ContactTopic, ReportReason } from '@/infra/database/schema'

/** Báo lỗi chương mới (đã chuẩn hóa) */
export type NewChapterReport = {
  storyId: string
  chapterNumber: number
  reporterId: string
  reason: ReportReason
  note: string
}

/** Báo lỗi đọc ra, kèm slug truyện và tên người báo */
export type ChapterReportViewRow = {
  id: string
  storySlug: string
  chapterNumber: number
  reason: ReportReason
  note: string
  reporterId: string
  reporterName: string
  status: 'open' | 'resolved'
  createdAt: Date
}

/** Tin nhắn liên hệ mới (đã chuẩn hóa) */
export type NewContactMessage = {
  userId: string | null
  name: string
  email: string
  topic: ContactTopic
  message: string
  ipHash: string | null
}
