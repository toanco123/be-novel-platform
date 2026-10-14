# Phần 16: Bình luận và chặn người dùng

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- `PublicProfileDto` (`modules/users/dto/public-profile.dto.ts`: `{ id, displayName, avatarUrl }`) dùng chung cho người viết bình luận và người bị chặn.
- Sửa `npm run dev`: thiếu devDependency `chokidar` (SWC cần cho `--watch`), cài `chokidar@5.0.0`.

## Mục tiêu

Thay phần bình luận (`features/comments/api.remote.ts`) và chặn người dùng (`features/blocks/api.remote.ts`) của web. Thích, báo cáo bình luận làm ở phần 17.

| Web                               | BE                                   |
| --------------------------------- | ------------------------------------ |
| `getComments` (`comment_threads`) | `GET /v1/stories/:slug/comments`     |
| `getReplies`                      | `GET /v1/comments/:id/replies`       |
| `addComment`                      | `POST /v1/stories/:slug/comments`    |
| `editComment`                     | `PATCH /v1/comments/:id`             |
| `deleteComment`                   | `DELETE /v1/comments/:id`            |
| `blockUser`, `unblockUser`        | `PUT` / `DELETE /v1/users/:id/block` |
| `getBlockedUsers`                 | `GET /v1/me/blocks`                  |

## Bảng (lấy đúng từ Supabase)

### `comments`

Bản cuối sau các migration `activity`, `rate_limits_and_account_deletion`, `comment_replies_and_reports`, `comment_likes_and_edits`.

| Cột              | Định nghĩa                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | uuid, khóa chính, `gen_random_uuid()`                                                                                                                    |
| `story_id`       | uuid not null → `stories(id)` on delete cascade                                                                                                          |
| `chapter_number` | integer, null: bình luận của cả truyện. Khóa ngoại ghép `(story_id, chapter_number)` → `chapters(story_id, number)` on delete cascade, on update cascade |
| `user_id`        | uuid not null → `profiles(id)` on delete cascade (bỏ `default auth.uid()`)                                                                               |
| `content`        | text not null, check 1–1000                                                                                                                              |
| `created_at`     | timestamptz not null default `now()`                                                                                                                     |
| `parent_id`      | uuid → `comments(id)` on delete cascade. null: bình luận gốc; xóa bình luận gốc thì trả lời mất theo                                                     |
| `like_count`     | integer not null default 0, check ≥ 0. Phần 17 thêm trigger đếm                                                                                          |
| `edited_at`      | timestamptz, null: chưa sửa                                                                                                                              |

Index:

- `comments_story_chapter_created_idx (story_id, chapter_number, created_at desc)`;
- `comments_user_id_created_at_idx (user_id, created_at desc)`;
- `comments_parent_id_created_at_idx (parent_id, created_at) where parent_id is not null`.

### `user_blocks` (migration `user_blocks`)

| Cột          | Định nghĩa                                                                                |
| ------------ | ----------------------------------------------------------------------------------------- |
| `blocker_id` | uuid not null → `users(id)` on delete cascade. Supabase trỏ `auth.users`; BE dùng `users` |
| `blocked_id` | uuid not null → `profiles(id)` on delete cascade                                          |
| `created_at` | timestamptz not null default `now()`                                                      |

- Khóa chính `(blocker_id, blocked_id)`.
- Check `user_blocks_not_self` (không tự chặn mình).
- Index `user_blocks_blocked_id_idx`.

## Luật (viết trong service, thay trigger và policy của Supabase)

### Xem

- **Ai thấy bình luận:** ai xem được truyện thì thấy bình luận (policy `comments_select_visible`).
- **Ẩn bình luận của người mình đã chặn:**
  - ẩn cả bình luận gốc lẫn trả lời;
  - không đếm vào số trả lời;
  - người bị chặn không biết; người khác vẫn thấy bình thường.

### Viết (`POST`)

Cần **xác nhận email**. Kiểm tra theo thứ tự, như trigger của Supabase:

1. **Truyện:** phải công khai (`StoryAccessService.public`). Không xem được → 404; chưa công khai → 409 `story_not_public`.
2. **Chương:** bình luận chương thì chương phải đã xuất bản, không thì 404.
3. **Trả lời** (`comments_check_parent`): chỉ một cấp.
   - Bình luận gốc không còn → 404 `parent_not_found`.
   - Trả lời vào một câu trả lời, hoặc khác truyện / khác chương → 400 `invalid_parent`.
4. **Gửi lặp** (`comments_rate_limit`): cùng người, cùng truyện, cùng chương, cùng nội dung trong 10 phút → 409 `duplicate_comment`.
5. **Hạn mức:** 3 bình luận / phút và 30 / giờ mỗi người, tính cả trả lời. Vượt → 429 `rate_limited`.
   - Dùng `RateLimitService`: xem còn lượt trước, ghi xong mới tính, giống cách tạo thể loại ở phần 7.
   - Gửi sai chỗ, gửi lặp không mất lượt.
6. **Nội dung:** bỏ khoảng trắng hai đầu, 1–1000 ký tự.

### Sửa (`PATCH`)

Như policy `comments_update_own`.

- Chỉ người viết, cần xác nhận email.
- Truyện còn công khai và chương còn xuất bản.
  - Bình luận không có → 404; của người khác → 403 `forbidden`.
  - Truyện chưa công khai → 409 `story_not_public`; chương bị ẩn → 404.
- Nội dung đổi thì đặt `edited_at = now()` (như trigger `comments_set_edited_at`). Gửi lại đúng nội dung cũ thì không đổi.

### Xóa (`DELETE`)

Như policy `comments_delete_author_or_owner`.

- Người viết hoặc chủ truyện xóa được. Không cần xác nhận email: xóa nội dung của mình luôn được.
- Trả lời mất theo bình luận gốc.
- Không có → 404; người khác → 403.
- Quản trị viên xóa bình luận bất kỳ làm ở đợt Quản trị.

### Chặn

- Không cần xác nhận email (dữ liệu riêng).
- Tự chặn mình → 400 `cannot_block_self`.
- Tài khoản không có → 404 (khóa ngoại `23503` → `not_found`).
- Chặn lại / bỏ chặn khi chưa chặn đều 204.

## API

| Endpoint                                                        | Việc                                                                                                                                                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/stories/:slug/comments?chapter=&sort=&page=&pageSize=` | Bình luận gốc của truyện (không có `chapter`) hoặc của chương `chapter`, phân trang (web dùng `pageSize=10`). `sort`: `newest` (mặc định) \| `top` (nhiều lượt thích trước, rồi mới nhất). Không cần đăng nhập |
| `GET /v1/comments/:id/replies`                                  | Trả lời của một bình luận gốc, cũ trước, tối đa 200 (`REPLIES_LIMIT`). Không cần đăng nhập                                                                                                                     |
| `POST /v1/stories/:slug/comments`                               | `{ content, chapter?, parentId? }` → 201 bình luận vừa viết                                                                                                                                                    |
| `PATCH /v1/comments/:id`                                        | `{ content }` → bình luận đã sửa                                                                                                                                                                               |
| `DELETE /v1/comments/:id`                                       | 204                                                                                                                                                                                                            |
| `GET /v1/me/blocks`                                             | Người mình đã chặn, mới chặn trước: `[{ user: { id, displayName, avatarUrl }, blockedAt }]`                                                                                                                    |
| `PUT /v1/users/:id/block`, `DELETE /v1/users/:id/block`         | Chặn / bỏ chặn → 204                                                                                                                                                                                           |

**`CommentDto`** (giống kiểu `Comment` của web):

| Trường                                                                                          | Ghi chú                                              |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `id`, `storySlug`, `chapterNumber`, `content`, `createdAt`, `parentId`, `likeCount`, `editedAt` |                                                      |
| `user`                                                                                          | `{ id, displayName, avatarUrl }`                     |
| `replyCount`                                                                                    | Không đếm trả lời của người mình đã chặn             |
| `isAuthor`                                                                                      | Người viết là chủ truyện và truyện không có bút danh |

- `likedByMe` thêm ở phần 17, cùng bảng `comment_likes`.
- `:id` phải là uuid, sai → 400.

### Mã lỗi mới

| Mã                  | Status | Khi nào                                                              |
| ------------------- | ------ | -------------------------------------------------------------------- |
| `parent_not_found`  | 404    | Trả lời một bình luận đã bị xóa                                      |
| `invalid_parent`    | 400    | Trả lời vào một câu trả lời, hoặc bình luận của truyện / chương khác |
| `duplicate_comment` | 409    | Gửi lại đúng bình luận vừa gửi trong 10 phút                         |
| `cannot_block_self` | 400    | Tự chặn mình                                                         |

## Bố cục

- **Module `src/modules/comments/`:**
  - `controllers/`: `story-comments.controller.ts` (`/v1/stories/:slug/comments`), `comments.controller.ts` (`/v1/comments/:id`);
  - `comments.service.ts`, `comments.repository.ts`, mapper, DTO.
- **Module `src/modules/blocks/`:** controller (`/v1/me/blocks`, `/v1/users/:id/block`), service, repository, DTO.
- **Ẩn bình luận người đã chặn:** điều kiện SQL `not exists (select 1 from user_blocks ...)` theo người xem. Khách không lọc gì.

## Kiểm tra

- **e2e bình luận:**
  - **Viết:**
    - bình luận truyện và bình luận chương nằm riêng nhau;
    - trả lời tăng `replyCount`;
    - `isAuthor` đúng (chủ truyện không bút danh → true; có bút danh → false).
  - **Quyền viết:**
    - chưa xác nhận email → 403;
    - truyện nháp của người khác → 404;
    - chủ truyện bình luận bản nháp → 409;
    - chương nháp → 404.
  - **Trả lời:**
    - gốc đã xóa → `parent_not_found`;
    - trả lời vào trả lời, khác chương → `invalid_parent`.
  - **Gửi lặp:** trong 10 phút → `duplicate_comment`; nội dung khác thì được.
  - **Hạn mức:** bình luận thứ 4 trong một phút → 429. Bình luận gửi lặp, sai chỗ không mất lượt.
  - **Danh sách:**
    - `newest`, `top` (đặt `like_count`), phân trang;
    - khách xem được;
    - truyện nháp → 404.
  - **Trả lời:** cũ trước.
  - **Sửa:**
    - của mình → `editedAt` có giá trị; gửi lại đúng nội dung thì `editedAt` không đổi;
    - của người khác → 403.
  - **Xóa:**
    - người viết, chủ truyện xóa được (trả lời mất theo);
    - người khác → 403.
  - **Cascade:** xóa chương → bình luận của chương mất; xóa tài khoản → bình luận mất.
- **e2e chặn:**
  - chặn → bình luận gốc, trả lời của người đó ẩn với mình, `replyCount` giảm, người khác vẫn thấy;
  - bỏ chặn → hiện lại;
  - danh sách đã chặn;
  - tự chặn → 400; tài khoản lạ → 404; uuid sai → 400.
- **Unit:** mapper.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - migration khớp schema;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Bình luận (gốc, trả lời, sửa, xóa, hạn mức) và chặn người dùng".
