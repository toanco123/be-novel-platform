# Phần 17: Thích bình luận, báo cáo bình luận

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:** `other` thiếu ghi chú báo lỗi trong service (`validation_failed`, `details.issues[0].code = requiredForOther`), vì `ValidateIf` của class-validator sẽ bỏ luôn kiểm tra độ dài của `note`.

## Mục tiêu

Thay phần thích và báo cáo bình luận của web (`features/comments/api.remote.ts`):

| Web                                             | BE                                       |
| ----------------------------------------------- | ---------------------------------------- |
| `setCommentLike(id, true / false)`              | `PUT` / `DELETE /v1/comments/:id/like`   |
| `Comment.likedByMe` (cột của `comment_threads`) | Thêm trường `likedByMe` vào `CommentDto` |
| `reportComment` (RPC `report_comment`)          | `POST /v1/comments/:id/reports`          |

Quản trị viên xem, xử lý báo cáo làm ở đợt Quản trị.

## Bảng (lấy đúng từ Supabase)

### `comment_likes` (migration `comment_likes_and_edits`)

| Cột          | Định nghĩa                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| `user_id`    | uuid not null → `profiles(id)` on delete cascade (bỏ `default auth.uid()`) |
| `comment_id` | uuid not null → `comments(id)` on delete cascade                           |
| `created_at` | timestamptz not null default `now()`                                       |

- Khóa chính `(user_id, comment_id)`: mỗi người một lượt thích.
- Index:
  - `comment_likes_comment_id_idx`;
  - `comment_likes_user_id_created_at_idx (user_id, created_at desc)`.

### `comment_reports` (migration `comment_replies_and_reports`, `comment_likes_and_edits`)

Supabase để ở schema `private`; BE chỉ có một schema nên để cùng chỗ với các bảng khác.

| Cột                | Định nghĩa                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `id`               | uuid, khóa chính                                                                                           |
| `comment_id`       | uuid not null → `comments(id)` on delete cascade                                                           |
| `reporter_id`      | uuid not null → `profiles(id)` on delete cascade                                                           |
| `reason`           | enum `comment_report_reason`: `spam` \| `offensive` \| `spoiler` \| `other`                                |
| `note`             | text not null default `''`, check ≤ 500                                                                    |
| `status`           | enum `report_status` (`open` \| `resolved`) not null default `open`. Phần 18 dùng chung cho báo lỗi chương |
| `created_at`       | timestamptz not null default `now()`                                                                       |
| `resolved_at`      | timestamptz                                                                                                |
| `content_snapshot` | text, check ≤ 1000. Nội dung bình luận lúc bị báo cáo (sửa bình luận không xóa được dấu vết)               |

- Check `comment_reports_check`: lý do `other` thì phải có ghi chú.
- Index:
  - unique một phần `comment_reports_open_unique (reporter_id, comment_id) where status = 'open'`: mỗi người một báo cáo đang mở cho mỗi bình luận;
  - `comment_reports_comment_id_status_idx (comment_id, status)`;
  - `comment_reports_reporter_id_created_at_idx (reporter_id, created_at desc)`.

## Trigger giữ ở DB

`comment_likes_count` (sau khi thêm / xóa lượt thích): `comments.like_count` ±1. Số liệu suy ra, chép từ Supabase.

## Luật (service, thay trigger `comment_likes_guard` và RPC `report_comment`)

### Thích

- Cần **xác nhận email**.
- **Kiểm tra:**
  - bình luận không có → 404;
  - truyện không công khai → 409 `story_not_public` (như policy `comment_likes_insert_own`);
  - tự thích bình luận của mình → 400 `own_comment_like`.
- **Hạn mức:** tối đa 300 lượt thích mới / giờ mỗi người → 429.
  - Chỉ tính lượt thích thật sự mới: thích lại khi đã thích không tính.
  - Bỏ thích không tính.
- **Gọi lặp:** thích khi đã thích, bỏ thích khi chưa thích đều 204.
- **Bỏ thích:** chỉ cần đăng nhập.

### Báo cáo bình luận

- Cần **xác nhận email**.
- **Kiểm tra:**
  - bình luận không có, hoặc truyện không công khai → 404, như RPC `report_comment`;
  - báo cáo bình luận của mình → 400 `own_comment_report`.
- **Đã có báo cáo đang mở của mình cho bình luận này:**
  - cập nhật lý do, ghi chú, nội dung lúc báo cáo, `created_at = now()`;
  - không tính vào hạn mức.
- **Báo cáo mới:** tối đa 10 / giờ mỗi người → 429.
- **Body `{ reason, note? }`:**
  - `note` bỏ khoảng trắng hai đầu, tối đa 500 ký tự;
  - bắt buộc khi `reason = other`, thiếu → 400.

## API

| Endpoint                        | Việc           |
| ------------------------------- | -------------- |
| `PUT /v1/comments/:id/like`     | Thích → 204    |
| `DELETE /v1/comments/:id/like`  | Bỏ thích → 204 |
| `POST /v1/comments/:id/reports` | Báo cáo → 204  |

- `CommentDto` thêm `likedByMe`: người xem đã thích chưa. Khách luôn `false`.
- Thứ tự `top` (phần 16) giờ có số liệu thật từ `like_count`.

### Mã lỗi mới

| Mã                   | Status | Khi nào                                                    |
| -------------------- | ------ | ---------------------------------------------------------- |
| `own_comment_like`   | 400    | Tự thích bình luận của mình                                |
| `own_comment_report` | 400    | Báo cáo bình luận của mình (Supabase gọi là `own_comment`) |

## Bố cục

- **Module `comments`** có 3 service nên gom vào thư mục con:
  - `services/`: bình luận, thích, báo cáo;
  - `repositories/`: tương ứng.
- **Route thêm vào `CommentsController`** (`/v1/comments/:id/...`).

## Kiểm tra

- **e2e:**
  - **Thích:**
    - thích → `likeCount` 1, `likedByMe` true (người khác xem: false, khách: false);
    - thích lại không tăng;
    - bỏ thích → 0;
    - thứ tự `top` đổi theo lượt thích.
  - **Quyền thích:**
    - tự thích → `own_comment_like`;
    - chưa xác nhận email → 403;
    - bình luận không có → 404;
    - truyện bị ẩn → 409.
  - **Hạn mức thích:** đặt sẵn 300 lượt trong cửa sổ Redis (gọi `RateLimitService`), lượt mới → 429; bỏ thích vẫn được.
  - **Xóa bình luận:** lượt thích mất theo, không lỗi.
  - **Báo cáo:**
    - báo cáo → có dòng `open` kèm `content_snapshot`;
    - báo lại → cập nhật lý do, không thêm dòng;
    - người viết sửa bình luận thì snapshot giữ nội dung cũ.
  - **Quyền, dữ liệu báo cáo:**
    - báo cáo của mình → `own_comment_report`;
    - `other` không ghi chú → 400;
    - lý do lạ → 400;
    - truyện bị ẩn → 404.
  - **Hạn mức báo cáo:** báo cáo mới thứ 11 trong giờ → 429.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - migration khớp schema;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Thích bình luận, báo cáo bình luận".
