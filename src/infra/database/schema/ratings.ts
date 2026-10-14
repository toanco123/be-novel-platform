// Chấm điểm truyện (mỗi người một điểm cho mỗi truyện): đúng định nghĩa bảng ratings của Supabase,
// trừ default auth.uid() của user_id. Phân bố sao story_stats.rating_counts do trigger tính
// (migration ratings_triggers).
import { sql } from 'drizzle-orm'
import { check, foreignKey, index, pgTable, primaryKey, smallint, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { profiles } from './profiles'
import { stories } from './stories'

export const ratings = pgTable(
  'ratings',
  {
    userId: uuid().notNull(),
    storyId: uuid().notNull(),
    score: smallint().notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ name: 'ratings_pkey', columns: [t.userId, t.storyId] }),
    foreignKey({
      name: 'ratings_user_id_fkey',
      columns: [t.userId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'ratings_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    check('ratings_score_check', sql`${t.score} between 1 and 5`),
    index('ratings_story_id_idx').on(t.storyId),
  ],
)
