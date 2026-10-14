import type { PublicationStatus, ReviewStatus, StoryStatus } from '@/infra/database/schema'

/** Thể loại gắn với truyện (gom bằng jsonb_agg, theo thứ tự tác giả chọn) */
export type StoryGenreRef = { slug: string; name: string; description: string | null }

/** Phần của truyện dùng để xét ai xem được */
export type StoryAccess = {
  visibility: PublicationStatus
  ownerId: string
  reviewStatus: ReviewStatus | null
}

/** Truyện tìm theo slug khi chỉ cần xét quyền xem (mục lục, lượt đọc) */
export type StoryAccessRow = StoryAccess & { id: string }

/**
 * Một thẻ truyện đọc từ DB (stories + profiles + story_stats + thể loại), tương đương một dòng view
 * story_cards của Supabase
 */
export type StoryCardRow = StoryAccess & {
  id: string
  slug: string
  title: string
  description: string
  status: StoryStatus
  /** Bút danh; null: hiển thị tên tài khoản */
  authorName: string | null
  ownerName: string
  coverPath: string | null
  coverThumbPath: string | null
  genres: StoryGenreRef[]
  chapterCount: number
  firstChapterNumber: number | null
  latestChapterNumber: number | null
  latestChapterTitle: string | null
  nextChapterNumber: number | null
  nextChapterAt: Date | null
  viewCount: number
  followerCount: number
  ratingAvg: number
  ratingCount: number
  ratingCounts: number[]
  /** Lần đầu công khai, chưa công khai thì lúc tạo */
  createdAt: Date
  /** Mới nhất trong: chương xuất bản gần nhất, lần đầu công khai, lúc tạo */
  updatedAt: Date
}

/** Đổi đường dẫn ảnh bìa (trong thư mục bìa) sang URL công khai */
export type CoverUrlOf = (path: string) => string

/** Độ dài truyện theo số chương đã xuất bản */
export type StoryLength = 'short' | 'medium' | 'long'

/** Thứ tự danh sách truyện (giảm dần) */
export type StorySort = 'updated' | 'views' | 'rating' | 'newest'

/** Danh sách truyện chọn tay trên trang chủ: banner nổi bật | truyện đề cử */
export type CuratedList = 'featured' | 'editor_pick'

/** Tác giả tách từ author.slug: chủ truyện và slug bút danh (null: truyện không bút danh) */
export type AuthorRef = { ownerId: string; authorKey: string | null }

/** Lọc danh sách truyện công khai */
export type StoryListFilter = {
  status?: StoryStatus
  genre?: string
  length?: StoryLength
  author?: AuthorRef
  sort: StorySort
}

/** Tiêu chí bảng xếp hạng (phiếu đề cử thêm ở đợt Phần thưởng) */
export type RankingCriterion = 'views' | 'rating' | 'follows'

/** Kỳ xếp hạng; chỉ có tác dụng với lượt đọc */
export type RankingPeriod = 'week' | 'month' | 'all'

/** Một dòng bảng xếp hạng: truyện và giá trị theo tiêu chí */
export type RankedStoryRow = { storyId: string; value: number }
