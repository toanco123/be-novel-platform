// Bình luận: đúng định nghĩa bảng comments của Supabase sau mọi migration (trả lời một cấp, lượt
// thích, lúc sửa), trừ default auth.uid() của user_id. Luật của trigger (bình luận gốc hợp lệ, hạn
// mức, gửi lặp, edited_at) viết trong service.
import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { chapters } from './chapters'
import { profiles } from './profiles'
import { stories } from './stories'

export const comments = pgTable(
  'comments',
  {
    id: uuid().primaryKey().defaultRandom(),
    storyId: uuid().notNull(),
    /** null: bình luận của cả truyện; có số: bình luận của chương đó */
    chapterNumber: integer(),
    userId: uuid().notNull(),
    content: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** null: bình luận gốc; có giá trị: trả lời của bình luận gốc đó (chỉ một cấp) */
    parentId: uuid(),
    likeCount: integer().notNull().default(0),
    /** Lần sửa nội dung gần nhất; null: chưa sửa */
    editedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: 'comments_story_id_fkey',
      columns: [t.storyId],
      foreignColumns: [stories.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'comments_story_id_chapter_number_fkey',
      columns: [t.storyId, t.chapterNumber],
      foreignColumns: [chapters.storyId, chapters.number],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'comments_user_id_fkey',
      columns: [t.userId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'comments_parent_id_fkey',
      columns: [t.parentId],
      foreignColumns: [t.id as AnyPgColumn],
    }).onDelete('cascade'),
    check('comments_content_check', sql`char_length(${t.content}) between 1 and 1000`),
    check('comments_like_count_check', sql`${t.likeCount} >= 0`),
    index('comments_story_chapter_created_idx').on(
      t.storyId,
      t.chapterNumber,
      t.createdAt.desc().nullsFirst(),
    ),
    index('comments_user_id_created_at_idx').on(t.userId, t.createdAt.desc().nullsFirst()),
    index('comments_parent_id_created_at_idx')
      .on(t.parentId, t.createdAt)
      .where(sql`${t.parentId} is not null`),
  ],
)
