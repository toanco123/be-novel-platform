import type { GenreDto } from './dto/genre.dto'
import type { GenreWithCreator } from './genres.types'

/** Dòng DB → thể loại trả về */
export function toGenre(row: GenreWithCreator): GenreDto {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    createdBy:
      row.createdBy && row.createdByName
        ? { id: row.createdBy, displayName: row.createdByName }
        : null,
    storyCount: row.storyCount,
    createdAt: row.createdAt.toISOString(),
  }
}
