/** Thứ tự mục lục theo số chương */
export type ChapterOrder = 'asc' | 'desc'

/** Lọc mục lục: chương đã xuất bản của truyện, số ≥ `from` (nếu có) */
export type ChapterListFilter = { storyId: string; from?: number; order: ChapterOrder }

/** Số và tên một chương (chương trước / sau, mục lục khi tải nhiều chương) */
export type ChapterOutlineRow = { number: number; title: string }

/** Một dòng mục lục */
export type ChapterSummaryRow = ChapterOutlineRow & { publishedAt: Date | null; createdAt: Date }

/** Một chương kèm nội dung */
export type ChapterContentRow = ChapterSummaryRow & { content: string }

/** Một lượt đọc đã qua kiểm tra trùng: ghi vào chapter_views và story_stats */
export type ChapterViewInput = { storyId: string; chapterNumber: number; day: string }
