// Thể loại của truyện: đúng định nghĩa bảng story_genres của Supabase. Tối đa 5 thể loại / truyện
// (trigger story_genres_limit của Supabase) kiểm tra trong service ở đợt Sáng tác.
import { foreignKey, index, pgTable, primaryKey, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { genres } from './genres'
import { stories } from './stories'

export const storyGenres = pgTable(
  'story_genres',
  {
    storyId: uuid().notNull(),
    genreSlug: text().notNull(),
    /** Thứ tự tác giả chọn */
    position: smallint().notNull().default(0),
  },
  (t) => [
    primaryKey({ name: 'story_genres_pkey', columns: [t.storyId, t.genreSlug] }),
    foreignKey({
      name: 'story_genres_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'story_genres_genre_slug_fkey',
      columns: [t.genreSlug],
      foreignColumns: [genres.slug],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    index('story_genres_genre_slug_idx').on(t.genreSlug),
  ],
)
