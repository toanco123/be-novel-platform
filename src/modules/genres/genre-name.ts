import { slugify } from '@/common/utils/slugify'
import type { NormalizedGenreName } from './genres.types'

/**
 * Tên người dùng gõ → tên lưu (bỏ khoảng trắng thừa, viết hoa chữ cái đầu) và slug để chặn trùng,
 * giống normalizeGenreName của web: "  ngôn   tình " → { name: 'Ngôn tình', slug: 'ngon-tinh' }
 */
export function normalizeGenreName(input: string): NormalizedGenreName {
  const name = input.trim().replace(/\s+/g, ' ')
  return { name: name.charAt(0).toLocaleUpperCase('vi') + name.slice(1), slug: slugify(name) }
}
