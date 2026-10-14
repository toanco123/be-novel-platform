# Phần 9: Bảng truyện, chương và trang chi tiết truyện

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- `StoriesMapper` là class inject được (cần `StorageService` để dựng URL bìa), không phải hàm thuần như mapper của genres.
- Thêm helper `adminUser(app)` (`test/helpers/auth.ts`); test genres dùng lại.

## Mục tiêu

- Tạo các bảng của phần đọc, **đúng định nghĩa Supabase** (cột, kiểu, check, tên constraint, index):
  - `stories`, `story_genres`, `chapters`;
  - `story_stats`, `chapter_views`, `curated_stories`.
- `story_stats` tự cập nhật bằng trigger như Supabase, để mọi đường ghi chương sau này đều ra số liệu đúng: Sáng tác, nhập hàng loạt, job xuất bản chương hẹn giờ.
- API đầu tiên của truyện: `GET /v1/stories/:slug`.
- Thêm `storyCount` cho thể loại (đã hẹn ở phần 7).
- Có helper tạo truyện, chương thẳng vào DB cho test. API ghi truyện, chương làm ở đợt 3.

## Bảng (lấy từ `../web-novel-platform/supabase/migrations/`)

Đọc hết các migration có sửa bảng: `catalog`, `activity`, `admin_moderation`, `story_author_name`, `chapter_content_rich_text`, `story_review`, `chapter_scheduling`, `checkin_and_votes`, `faster_cards_and_thumbs`.

### Enum

- `story_status`: `ongoing` | `completed`
- `publication_status`: `draft` | `published` (`stories.visibility`, `chapters.status`)
- `review_status`: `pending` | `approved` | `rejected`

### `stories`

| Cột                                  | Định nghĩa                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `id`                                 | uuid, khóa chính, `gen_random_uuid()`                                                           |
| `owner_id`                           | uuid not null → `profiles(id)` on delete cascade                                                |
| `slug`                               | text not null unique (`stories_slug_key`); check `^[a-z0-9]+(-[a-z0-9]+)*$` và tối đa 140 ký tự |
| `title`                              | text not null, check 2–120                                                                      |
| `description`                        | text not null default `''`, check ≤ 3000                                                        |
| `status`                             | `story_status` not null default `ongoing`                                                       |
| `visibility`                         | `publication_status` not null default `draft`                                                   |
| `cover_path`                         | text, check ≤ 300. Đường dẫn trong thư mục bìa `{owner_id}/{uuid}.webp`, như Supabase           |
| `search_title`                       | text, sinh tự động `slugify(title)` stored                                                      |
| `created_at`, `updated_at`           | timestamptz not null default `now()`                                                            |
| `published_at`                       | timestamptz: lần đầu công khai                                                                  |
| `taken_down_at`                      | timestamptz                                                                                     |
| `takedown_reason`                    | text, check 1–500                                                                               |
| `author_name`                        | text, check null hoặc 1–60 (bút danh)                                                           |
| `review_status`                      | `review_status`                                                                                 |
| `review_submitted_at`, `reviewed_at` | timestamptz                                                                                     |
| `review_reason`                      | text, check 1–500                                                                               |
| `cover_thumb_path`                   | text                                                                                            |

- **Check ghép:**
  - `stories_takedown_consistent`: `taken_down_at` và `takedown_reason` cùng null hoặc cùng có.
  - `stories_review_reason_rejected`: có lý do khi và chỉ khi `rejected`.
- **Index:**
  - `stories_owner_id_updated_at_idx (owner_id, updated_at desc)`;
  - `stories_search_title_trgm_idx`: gin trigram trên `search_title`.

### Các bảng còn lại

| Bảng              | Định nghĩa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `story_genres`    | `story_id` → `stories` cascade; `genre_slug` → `genres(slug)` cascade, on update cascade; `position` smallint not null default 0. Khóa chính `(story_id, genre_slug)`, index `story_genres_genre_slug_idx`                                                                                                                                                                                                                                                                                                                               |
| `chapters`        | `id` uuid; `story_id` → `stories` cascade; `number` integer check 1–99999; `title` text not null default `''` check ≤ 120; `content` text not null check 1–200000 (`chapters_content_check`); `status` `publication_status` default `draft`; `created_at`, `updated_at`, `published_at`, `scheduled_at`. Unique `(story_id, number)` (`chapters_story_id_number_key`). Check `chapters_scheduled_draft`: chỉ chương nháp có giờ hẹn. Index một phần `chapters_scheduled_at_idx (scheduled_at) where scheduled_at is not null`            |
| `story_stats`     | `story_id` khóa chính → `stories` cascade. Cột: `chapter_count`, `first_chapter_number`, `latest_chapter_number`, `latest_chapter_title`, `last_chapter_at`, `view_count` bigint, `follower_count`, `rating_counts` integer[5] default `{0,0,0,0,0}` (check `cardinality = 5`), `next_chapter_number`, `next_chapter_at`, `vote_count` bigint. Cột sinh tự động: `rating_count`, `rating_sum`, `rating_avg` numeric(3,2), bằng 0 khi chưa có lượt chấm. Index `story_stats_last_chapter_at_idx`, `story_stats_view_count_idx` (giảm dần) |
| `chapter_views`   | `story_id`, `chapter_number`, `day` date, `views` integer default 0 check ≥ 0. Khóa chính `(story_id, chapter_number, day)`. Khóa ngoại ghép → `chapters(story_id, number)` cascade, on update cascade. Index `chapter_views_day_story_idx (day, story_id) include (views)`                                                                                                                                                                                                                                                              |
| `curated_stories` | `list` text check `featured` \| `editor_pick`; `story_id` → `stories` cascade; `position` smallint default 0. Khóa chính `(list, story_id)`, index `curated_stories_story_id_idx`                                                                                                                                                                                                                                                                                                                                                        |

- Tên constraint giống Postgres tự đặt trên Supabase: `<bảng>_<cột>_check`, `<bảng>_<cột>_fkey`, `<bảng>_pkey`, `<bảng>_<cột>_key`.
- **Sửa tên khóa ngoại cũ cho khớp Supabase:** phần 4 và phần 7 để Drizzle tự đặt tên.
  - `profiles_id_users_id_fk` → `profiles_id_fkey`;
  - `genres_created_by_profiles_id_fk` → `genres_created_by_fkey`.

### Khác Supabase (ghi lại để chuyển dữ liệu)

- **Bỏ `default auth.uid()`** của `owner_id` (BE không có `auth.uid()`; service ghi rõ người tạo).
- **Extension `unaccent`, `pg_trgm`** cài ở schema `public` (Supabase để ở `extensions`).
- **Hàm SQL `slugify(text)`** (immutable) chép từ `public.slugify` của Supabase, để làm cột sinh `search_title`. Cho cùng kết quả với `slugify` của TypeScript; có test so sánh.
- **Không có RLS, grant, policy.** Ai xem được gì viết trong service (mục API).
- **Luật nghiệp vụ trong trigger của Supabase chuyển vào service ở đợt 3** (Sáng tác), khi có API ghi:
  - truyện chỉ công khai khi có chương đã xuất bản;
  - chương công khai cuối cùng;
  - khóa số chương đã xuất bản;
  - tối đa 5 thể loại;
  - truyện bị gỡ, duyệt truyện;
  - bìa nhỏ, giờ hẹn;
  - `published_at` của chương.

### Trigger giữ ở DB (số liệu suy ra)

Migration `--custom`, chép từ bản mới nhất của Supabase. Đây là số liệu suy ra, không phải luật nghiệp vụ, nên đặt ở DB để không đường ghi nào làm lệch số liệu.

| Trigger                                             | Việc                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `stories_set_updated_at`, `chapters_set_updated_at` | `set_updated_at()` chung (migration 0000)                                                                                          |
| `stories_create_stats`                              | Tạo truyện thì tạo dòng `story_stats`                                                                                              |
| `chapters_after_change`                             | Thêm / sửa / xóa chương thì tính lại `story_stats`, và đặt `stories.updated_at = now()` (truyện đã bị xóa theo cascade thì bỏ qua) |

`chapters_after_change` tính lại:

- các cột về chương, chỉ tính chương đã xuất bản: số chương, chương đầu, chương mới nhất (số và tên), `last_chapter_at`;
- chương hẹn giờ sớm nhất: `next_chapter_number`, `next_chapter_at`.

`view_count`, `follower_count`, `rating_counts`, `vote_count` do service ghi ở phần 10 và các đợt sau.

### Thứ tự migration

1. `0007_catalog_functions` (custom): extension, hàm `slugify`. Phải có trước bảng, vì cột sinh gọi hàm này.
2. `0008_catalog` (Drizzle sinh): enum, bảng, constraint, index, đổi tên khóa ngoại.
3. `0009_catalog_triggers` (custom):
   - các trigger ở trên;
   - index `chapter_views_day_story_idx`: Drizzle không viết được `include`, nên schema chỉ ghi chú.

## API

### `GET /v1/stories/:slug` (`@Public`)

- **Ai xem được** (như policy `stories_select_visible`):
  - truyện công khai: mọi người;
  - truyện nháp: chủ truyện (xem trước);
  - truyện đang chờ duyệt: quản trị viên.
  - Còn lại → 404 `not_found`. Không báo 403, để không lộ truyện nháp có tồn tại.
- Không đặt `Cache-Control`, vì chủ truyện và quản trị viên thấy khác khách.
- **`StoryDetailDto`** (giống kiểu `Story` của web, thêm số liệu cho trang chi tiết):

  | Trường                                                                   | Giá trị                                                                                                                                                                                                                      |
  | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`, `slug`, `title`, `status`, `visibility`, `ownerId`                 |                                                                                                                                                                                                                              |
  | `author`                                                                 | `{ slug, name }`. `name` = bút danh, không có thì tên hiển thị của chủ truyện. `slug` = `tac-gia-<ownerId>`, thêm `-<slugify(bút danh)>` khi có bút danh (giống `authorSlug` của web, dùng cho lọc "cùng tác giả" ở phần 11) |
  | `genres`                                                                 | `[{ slug, name, description }]` theo thứ tự tác giả chọn (`position`, rồi tên)                                                                                                                                               |
  | `description`                                                            | Đầy đủ. Thẻ truyện ở danh sách (`StoryDto`, phần 11) chỉ lấy 300 ký tự đầu                                                                                                                                                   |
  | `coverUrl`, `coverThumbUrl`                                              | `S3_PUBLIC_URL/covers/<cover_path>`, null khi chưa có                                                                                                                                                                        |
  | `chapterCount`, `firstChapterNumber`                                     | Chỉ tính chương đã xuất bản                                                                                                                                                                                                  |
  | `latestChapter`                                                          | `{ number, title }` \| null                                                                                                                                                                                                  |
  | `nextChapter`                                                            | `{ number, at }` \| null: chương hẹn giờ sớm nhất                                                                                                                                                                            |
  | `viewCount`, `followerCount`, `ratingAvg`, `ratingCount`, `ratingCounts` | `ratingCounts`: số lượt chấm 1..5 sao                                                                                                                                                                                        |
  | `createdAt`                                                              | Lần đầu công khai, chưa công khai thì lúc tạo                                                                                                                                                                                |
  | `updatedAt`                                                              | Mới nhất trong: chương xuất bản gần nhất, lần đầu công khai, lúc tạo                                                                                                                                                         |

  `createdAt`, `updatedAt` tính như view `story_cards`.

- `StoryDto` (thẻ truyện) đặt sẵn ở phần này, `StoryDetailDto` kế thừa và thêm `followerCount`, `ratingCounts`.

### Thể loại có `storyCount`

- `GenreDto` thêm `storyCount`: số truyện công khai có ít nhất một chương đã xuất bản (như `genre_cards`).
- `GET /v1/genres`, `GET /v1/genres/:slug` đều có; tạo mới trả `0`.

## Bố cục

- **`src/modules/stories/`:**
  - `stories.controller.ts`, `stories.service.ts`;
  - `stories.repository.ts`: truy vấn thẻ truyện, gồm `stories` + `profiles` + `story_stats` + thể loại gom bằng `jsonb_agg`, tương đương view `story_cards`. Các phần sau dùng lại cho danh sách, tìm kiếm, xếp hạng;
  - `stories.mapper.ts` (dòng → DTO; URL bìa qua `StorageService.publicUrl`);
  - `stories.rules.ts` (`canViewStory(story, actor)`);
  - `stories.types.ts`;
  - `dto/`: mỗi DTO một file (`story.dto.ts`, `story-detail.dto.ts`, `story-author.dto.ts`, `story-genre.dto.ts`, `chapter-ref.dto.ts`, `next-chapter.dto.ts`).
- **Schema:** mỗi bảng một file trong `infra/database/schema/`; kiểu dòng thêm vào `schema.types.ts`.
- **Test:** `test/helpers/stories.ts` có `createStory(db, {...})`.
  - Ghi thẳng `stories`, `story_genres`, `chapters`; trigger tự tính số liệu.
  - Mặc định: truyện công khai, đã duyệt, một chương đã xuất bản, slug riêng mỗi lần.

## Kiểm tra

- **e2e:**
  - **Số liệu** (trigger):
    - chỉ đếm chương đã xuất bản; đúng chương đầu, chương mới nhất (số và tên);
    - `nextChapter` là chương nháp hẹn giờ sớm nhất;
    - sửa, xóa chương thì số liệu đổi theo;
    - xóa truyện, xóa tài khoản chủ truyện: cascade không lỗi.
  - **`GET /v1/stories/:slug`:**
    - khách xem truyện công khai: đủ trường, thể loại đúng thứ tự, URL bìa;
    - có bút danh thì `author.name`, `author.slug` đổi theo.
  - **Quyền xem:**
    - truyện nháp: khách, người khác → 404; chủ truyện → 200;
    - truyện chờ duyệt: quản trị viên → 200;
    - slug không có → 404.
  - **Hàm SQL `slugify`** cho cùng kết quả với `slugify` TypeScript (các ví dụ của web, có `đ`, dấu, ký tự đặc biệt); `search_title` tự sinh.
  - **Constraint:** vi phạm check (vd tên truyện 1 ký tự) → lỗi `23514`; thêm chương trùng số → `23505`.
  - **Thể loại:** `storyCount` chỉ đếm truyện công khai có chương.
- **Unit:** `canViewStory`; mapper (`author.slug` có / không bút danh, URL bìa, `latestChapter` / `nextChapter` null).
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - `db:generate` không ra file mới;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Bảng truyện, chương, số liệu (đúng Supabase), trigger số liệu, chi tiết truyện, storyCount cho thể loại".
