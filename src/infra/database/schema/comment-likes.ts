// Thích bình luận (mỗi người một lượt): đúng định nghĩa bảng comment_likes của Supabase, trừ default
// auth.uid() của user_id. comments.like_count do trigger comment_likes_count ghi.
import { foreignKey, index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { comments } from './comments'
import { profiles } from './profiles'

export const commentLikes = pgTable(
  'comment_likes',
  {
    userId: uuid().notNull(),
    commentId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'comment_likes_pkey', columns: [t.userId, t.commentId] }),
    foreignKey({
      name: 'comment_likes_user_id_fkey',
      columns: [t.userId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'comment_likes_comment_id_fkey',
      columns: [t.commentId],
      foreignColumns: [comments.id],
    }).onDelete('cascade'),
    index('comment_likes_comment_id_idx').on(t.commentId),
    index('comment_likes_user_id_created_at_idx').on(t.userId, t.createdAt.desc().nullsFirst()),
  ],
)
