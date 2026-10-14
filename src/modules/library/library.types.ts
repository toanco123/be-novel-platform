/** Chỗ đọc dở lưu trong reading_history */
export type ProgressRow = {
  chapterNumber: number
  chapterTitle: string
  progress: number
  readAt: Date
}

/** Một dòng lịch sử kèm truyện */
export type HistoryRow = ProgressRow & { storyId: string; slug: string }

/** Chỗ đọc mới; progress không có thì giữ tiến độ cũ nếu vẫn chương đó (đổi chương thì về 0) */
export type SaveProgressInput = { chapter: number; chapterTitle: string; progress?: number }

/** Một dòng lịch sử khách đã chuẩn hóa để gộp */
export type GuestHistoryEntry = {
  slug: string
  chapter: number
  chapterTitle: string
  progress: number
  /** ISO, không sau thời điểm hiện tại */
  readAt: string
}
