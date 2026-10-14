import type { GenreRow } from '@/infra/database/schema'

/** Dòng genres kèm tên người tạo (như view genre_cards của Supabase) */
export type GenreWithCreator = GenreRow & { createdByName: string | null }

/** Tên và slug sau khi chuẩn hóa */
export type NormalizedGenreName = { name: string; slug: string }

/** Dữ liệu tạo thể loại (đã chuẩn hóa) */
export type NewGenre = {
  slug: string
  name: string
  description: string | null
  createdBy: string
}
