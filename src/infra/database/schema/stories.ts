// Truyện: đúng định nghĩa bảng stories của Supabase sau mọi migration (cột, check, tên constraint,
// index), trừ default auth.uid() của owner_id. search_title sinh bằng hàm SQL slugify (migration
// 0007_catalog_functions). Luật nghiệp vụ trong trigger của Supabase (công khai, gỡ, duyệt, bìa nhỏ)
// viết trong service ở đợt Sáng tác.
import { type SQL, sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { profiles } from './profiles'
import { publicationStatus, reviewStatus, storyStatus } from './story-enums'

export const stories = pgTable(
  'stories',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid().notNull(),
    /** Không đổi sau khi tạo để link đã chia sẻ vẫn dùng được khi đổi tên truyện */
    slug: text().notNull(),
    title: text().notNull(),
    description: text().notNull().default(''),
    status: storyStatus().notNull().default('ongoing'),
    visibility: publicationStatus().notNull().default('draft'),
    /** Đường dẫn trong thư mục bìa ({owner_id}/{uuid}.webp), như Supabase */
    coverPath: text(),
    searchTitle: text().generatedAlwaysAs((): SQL => sql`slugify(${stories.title})`),
    /** Lần sửa gần nhất của tác giả, kể cả khi sửa chương (trigger chapters_after_change) */
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Lần đầu công khai */
    publishedAt: timestamp({ withTimezone: true }),
    takenDownAt: timestamp({ withTimezone: true }),
    takedownReason: text(),
    /** Bút danh / tác giả gốc; null: hiển thị tên tài khoản */
    authorName: text(),
    reviewStatus: reviewStatus(),
    reviewSubmittedAt: timestamp({ withTimezone: true }),
    reviewedAt: timestamp({ withTimezone: true }),
    /** Lý do từ chối (chỉ khi rejected) */
    reviewReason: text(),
    /** Bìa nhỏ 320×480 ({uuid}-thumb.webp cạnh cover_path); null: chưa có */
    coverThumbPath: text(),
  },
  (t) => [
    foreignKey({
      name: 'stories_owner_id_fkey',
      columns: [t.ownerId],
      foreignColumns: [profiles.id],
    }).onDelete('cascade'),
    unique('stories_slug_key').on(t.slug),
    check(
      'stories_slug_check',
      sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(${t.slug}) <= 140`,
    ),
    check('stories_title_check', sql`char_length(${t.title}) between 2 and 120`),
    check('stories_description_check', sql`char_length(${t.description}) <= 3000`),
    check('stories_cover_path_check', sql`char_length(${t.coverPath}) <= 300`),
    check('stories_takedown_reason_check', sql`char_length(${t.takedownReason}) between 1 and 500`),
    check(
      'stories_takedown_consistent',
      sql`(${t.takenDownAt} is null) = (${t.takedownReason} is null)`,
    ),
    check(
      'stories_author_name_check',
      sql`${t.authorName} is null or char_length(${t.authorName}) between 1 and 60`,
    ),
    check('stories_review_reason_check', sql`char_length(${t.reviewReason}) between 1 and 500`),
    check(
      'stories_review_reason_rejected',
      sql`case when ${t.reviewStatus} = 'rejected' then ${t.reviewReason} is not null else ${t.reviewReason} is null end`,
    ),
    index('stories_owner_id_updated_at_idx').on(t.ownerId, t.updatedAt.desc().nullsFirst()),
    index('stories_search_title_trgm_idx').using('gin', t.searchTitle.op('gin_trgm_ops')),
  ],
)
