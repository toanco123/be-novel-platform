/** Số chương tối đa mỗi lần tải nhiều chương (web tải trước 5, tải về đọc offline từng đợt 20) */
export const MAX_CHAPTER_BATCH = 20

/** Số chương lớn nhất (check chapters_number_check) */
export const MAX_CHAPTER_NUMBER = 99999

/**
 * Khóa Redis "người này đã được tính lượt đọc chương này hôm nay" sống 2 ngày (chỉ cần hôm nay và hôm
 * qua, như nhật ký private.chapter_view_log của Supabase)
 */
export const VIEW_SEEN_TTL_SECONDS = 2 * 24 * 60 * 60
