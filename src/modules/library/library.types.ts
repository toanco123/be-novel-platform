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

/** Chỗ đọc dở kèm truyện (tủ truyện lấy nhiều truyện một lần) */
export type StoryProgressRow = ProgressRow & { storyId: string }

/** Một truyện đang theo dõi */
export type LibraryRow = {
  storyId: string
  followedAt: Date
  seenChapter: number
  /** Số chương đã xuất bản có số lớn hơn mốc "đã thấy" */
  newChapters: number
}
