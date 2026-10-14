import { slugify } from '@/common/utils/slugify'
import { AUTHOR_SLUG_PATTERN } from './stories.constants'
import type { AuthorRef } from './stories.types'

/**
 * Khóa "tác giả" của truyện: chủ truyện, cộng bút danh nếu có, giống authorSlug của web:
 * tac-gia-<uuid> hoặc tac-gia-<uuid>-<bút-danh-dạng-slug>. Truyện cùng khóa là "cùng tác giả".
 */
export function authorSlug(ownerId: string, authorName: string | null) {
  const key = authorName ? slugify(authorName) : ''
  return key ? `tac-gia-${ownerId}-${key}` : `tac-gia-${ownerId}`
}

/** Tách khóa tác giả (giống parseAuthorSlug của web); sai dạng → null */
export function parseAuthorSlug(slug: string): AuthorRef | null {
  const match = AUTHOR_SLUG_PATTERN.exec(slug)
  return match ? { ownerId: match[1]!, authorKey: match[2] ?? null } : null
}
