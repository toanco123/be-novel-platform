import type {
  CuratedList,
  RankingCriterion,
  RankingPeriod,
  StoryLength,
  StorySort,
} from './stories.types'

/** Thư mục ảnh bìa trong bucket (stories.cover_path là đường dẫn bên trong, như Supabase Storage) */
export const COVERS_PREFIX = 'covers'

/** Thẻ truyện ở danh sách chỉ lấy đoạn đầu mô tả (như description_short của story_cards) */
export const CARD_DESCRIPTION_LENGTH = 300

/** Danh sách công khai giống nhau với mọi người: cache ở trình duyệt / CDN 60 giây */
export const STORIES_CACHE_CONTROL = 'public, max-age=60'

/** Slug thể loại (check genres_slug_check) */
export const GENRE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** tac-gia-<uuid> hoặc tac-gia-<uuid>-<slug bút danh>; nhóm 1 là uuid, nhóm 2 là slug bút danh */
export const AUTHOR_SLUG_PATTERN =
  /^tac-gia-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?$/

export const STORY_STATUSES = ['ongoing', 'completed'] as const
export const STORY_LENGTHS = ['short', 'medium', 'long'] as const satisfies StoryLength[]
export const STORY_SORTS = ['updated', 'views', 'rating', 'newest'] as const satisfies StorySort[]
export const CURATED_LISTS = ['featured', 'editor_pick'] as const satisfies CuratedList[]

/** Độ dài theo số chương đã xuất bản (như web): ngắn < 50, vừa 50–200, dài > 200 */
export const SHORT_STORY_MAX_CHAPTERS = 49
export const LONG_STORY_MIN_CHAPTERS = 201

/** Chưa chọn tay thì trang chủ tự chọn bằng này truyện (như web) */
export const CURATED_FALLBACK: Record<CuratedList, { sort: StorySort; limit: number }> = {
  // Nhiều lượt đọc nhất, rồi mới cập nhật
  featured: { sort: 'views', limit: 4 },
  // Điểm cao nhất, nhiều lượt chấm, rồi mới đăng
  editor_pick: { sort: 'rating', limit: 8 },
}

/** Từ khóa tìm kiếm tối đa 100 ký tự */
export const MAX_SEARCH_QUERY = 100

export const RANKING_CRITERIA = ['views', 'rating', 'follows'] as const satisfies RankingCriterion[]
export const RANKING_PERIODS = ['week', 'month', 'all'] as const satisfies RankingPeriod[]

/** Số ngày của kỳ xếp hạng theo lượt đọc (giờ Việt Nam, tính cả hôm nay) */
export const RANKING_PERIOD_DAYS = { week: 7, month: 30 } as const

/**
 * Xếp theo điểm có trọng số: thêm 50 lượt chấm "ảo" bằng điểm trung bình chung, để truyện ít lượt chấm
 * không vượt truyện nhiều lượt (như story_ranking của Supabase)
 */
export const RATING_PRIOR = 50

export const DEFAULT_RANKING_LIMIT = 50
export const MAX_RANKING_LIMIT = 100

export const DEFAULT_RELATED_LIMIT = 6
export const MAX_RELATED_LIMIT = 50
