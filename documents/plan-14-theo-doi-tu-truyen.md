# Phần 14: Theo dõi truyện và tủ truyện

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:** biểu thức `createdAt` / `updatedAt` của thẻ truyện chuyển ra `modules/stories/story-columns.ts` để tủ truyện sắp xếp cùng cách với danh sách truyện.

## Mục tiêu

Thay phần theo dõi, tủ truyện của web (`features/library/api.remote.ts`) và các RPC `get_library`, `library_update_count` của Supabase:

| Web                                          | BE                                        |
| -------------------------------------------- | ----------------------------------------- |
| `getFollowStatus`                            | `GET /v1/stories/:slug/follow`            |
| `followStory`, `unfollowStory`               | `PUT` / `DELETE /v1/stories/:slug/follow` |
| `getLibrary` (`library_cards` + lịch sử đọc) | `GET /v1/me/library`                      |
| `getLibraryUpdateCount` (chấm đỏ ở header)   | `GET /v1/me/library/update-count`         |

## Bảng `follows` (lấy đúng từ Supabase, migration `activity`)

| Cột            | Định nghĩa                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| `user_id`      | uuid not null → `profiles(id)` on delete cascade (bỏ `default auth.uid()`) |
| `story_id`     | uuid not null → `stories(id)` on delete cascade                            |
| `followed_at`  | timestamptz not null default `now()`                                       |
| `seen_chapter` | integer not null default 0, check ≥ 0: chương mới nhất người dùng đã thấy  |

- Khóa chính `(user_id, story_id)`, index `follows_story_id_idx (story_id)`.
- **Số chương mới** = số chương đã xuất bản có số lớn hơn `seen_chapter`.

## Trigger giữ ở DB (chép từ bản mới nhất của Supabase)

Cùng lý do với phần 9: đây là trạng thái suy ra, mọi đường ghi phải ra cùng một kết quả. Vd mốc "đã thấy" phải được nâng cả khi lưu chỗ đọc lẫn khi gộp lịch sử khách.

| Trigger                                                  | Việc                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `follows_set_seen_chapter` (trước khi thêm)              | Mốc "đã thấy" = lớn nhất của: chương mới nhất hiện có, chương đã đọc tới trong lịch sử                        |
| `follows_count` (sau khi thêm / xóa)                     | `story_stats.follower_count` ±1. Bỏ qua khi truyện đã bị xóa theo cascade (bản `counters_skip_deleted_story`) |
| `reading_history_bump_seen` (sau khi thêm / sửa lịch sử) | Đọc tới chương xa hơn mốc "đã thấy" của truyện đang theo dõi thì nâng mốc                                     |

## API

| Endpoint                          | Việc                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /v1/stories/:slug/follow`    | `{ following }`. Cần đăng nhập                                                                         |
| `PUT /v1/stories/:slug/follow`    | Theo dõi → 204; đã theo dõi rồi cũng 204. Cần **xác nhận email** (làm đổi số người theo dõi, xếp hạng) |
| `DELETE /v1/stories/:slug/follow` | Bỏ theo dõi → 204, chưa theo dõi cũng 204. Chỉ cần đăng nhập (luôn bỏ được)                            |
| `GET /v1/me/library`              | Truyện đang theo dõi: `[{ story, followedAt, seenChapter, newChapters, progress }]`                    |
| `GET /v1/me/library/update-count` | `{ count }`: số truyện đang theo dõi có chương mới                                                     |

- **Theo dõi:**
  - Truyện phải xem được (`canViewStory`), như policy `follows_insert_own` (RLS của `stories`). Không thì 404.
  - Đọc trạng thái, bỏ theo dõi: truyện không có → 404.
- **Tủ truyện** (như `get_library`):
  - Chỉ truyện người gọi còn xem được. Truyện bị ẩn, bị gỡ thì tạm không hiện, theo dõi vẫn giữ.
  - Thứ tự: truyện có chương mới trước, rồi truyện mới cập nhật (`updatedAt` của thẻ truyện).
  - `progress`: chỗ đọc dở trong lịch sử (`ReadingProgressDto`), chưa đọc thì null.
  - Trả cả danh sách, không phân trang, như web.
- **Số truyện có chương mới:** đếm trên cùng tập truyện của tủ truyện.

## Thiết kế

- **Module `library`** có 3 controller (lịch sử, theo dõi, tủ truyện) nên gom thư mục:
  - `controllers/`, `services/`, `repositories/`;
  - `history.mapper.ts` đổi thành `library.mapper.ts`.
- **`FollowsRepository`:**
  - `isFollowing`;
  - `follow`: `insert ... on conflict do nothing`;
  - `unfollow`;
  - `library(actor)`: theo dõi + số chương mới (subquery đếm chương);
  - `updateCount(actor)`.
- **`HistoryRepository.findMany(userId, storyIds)`:** chỗ đọc dở của nhiều truyện cùng lúc, cho tủ truyện.

## Kiểm tra

- **e2e:**
  - **Theo dõi / bỏ theo dõi:**
    - trạng thái đổi theo;
    - `follower_count` của truyện ±1;
    - gọi lặp không đếm thêm.
  - **Quyền:**
    - chưa xác nhận email → 403 `email_not_verified` (nhưng bỏ theo dõi được);
    - chưa đăng nhập → 401;
    - truyện nháp của người khác → 404.
  - **Mốc "đã thấy":**
    - theo dõi lúc truyện có chương 5 → `seenChapter` 5, `newChapters` 0;
    - xuất bản thêm chương 6, 7 → `newChapters` 2, `update-count` tăng;
    - lưu chỗ đọc chương 7 → `newChapters` 0;
    - đã đọc tới chương 9 trước khi theo dõi → mốc 9.
  - **Tủ truyện:**
    - có chương mới đứng trước, rồi mới cập nhật;
    - kèm `progress`;
    - truyện bị ẩn tạm không hiện;
    - chỉ thấy của mình.
  - **Xóa truyện, xóa tài khoản người theo dõi:** cascade không lỗi; số người theo dõi của truyện giảm khi người theo dõi xóa tài khoản.
- **Unit:** mapper tủ truyện.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - migration khớp schema;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Theo dõi truyện, tủ truyện, số truyện có chương mới".
