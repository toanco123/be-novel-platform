import { slugify } from '@/common/utils/slugify'

/**
 * Khóa "tác giả" của truyện: chủ truyện, cộng bút danh nếu có, giống authorSlug của web:
 * tac-gia-<uuid> hoặc tac-gia-<uuid>-<bút-danh-dạng-slug>. Truyện cùng khóa là "cùng tác giả".
 */
export function authorSlug(ownerId: string, authorName: string | null) {
  const key = authorName ? slugify(authorName) : ''
  return key ? `tac-gia-${ownerId}-${key}` : `tac-gia-${ownerId}`
}
