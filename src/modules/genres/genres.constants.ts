import type { RateLimitOptions } from '@/common/rate-limit/rate-limit.types'

/** Mỗi người tạo tối đa 10 thể loại / ngày (như trigger genres_rate_limit của Supabase) */
export const CREATE_GENRE_LIMIT: RateLimitOptions = { limit: 10, windowSeconds: 86_400 }

/** Danh sách công khai cache ở trình duyệt / CDN 60 giây */
export const GENRES_CACHE_CONTROL = 'public, max-age=60'

/** Từ khóa tìm thể loại tối đa 100 ký tự */
export const MAX_GENRE_QUERY = 100
