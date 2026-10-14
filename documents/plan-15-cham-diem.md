# Phần 15: Chấm điểm truyện

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:** thêm `StoryAccessService` (`modules/stories/services/story-access.service.ts`) để tìm truyện theo slug và xét quyền ở một chỗ:

- `visible`: xem được hay không;
- `public`: xem được và đang công khai, không thì `story_not_public`;
- `existing`: chỉ cần truyện còn.

Các service chương, lịch sử, theo dõi, truyện liên quan đổi sang dùng service này, thay đoạn `findAccessBySlug` + `canViewStory` lặp lại.

## Mục tiêu

Thay phần chấm điểm của web (`features/comments/api.remote.ts`):

| Web                                        | BE                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `getMyRating`                              | `GET /v1/stories/:slug/rating`                                                           |
| `rateStory` (upsert `ratings`)             | `PUT /v1/stories/:slug/rating`                                                           |
| Xóa điểm (Supabase cho xóa dòng `ratings`) | `DELETE /v1/stories/:slug/rating`                                                        |
| `getRatingSummary`                         | Đã có trong `GET /v1/stories/:slug` (phần 9): `ratingAvg`, `ratingCount`, `ratingCounts` |

## Bảng `ratings` (lấy đúng từ Supabase, migration `activity`)

| Cột                        | Định nghĩa                                                                 |
| -------------------------- | -------------------------------------------------------------------------- |
| `user_id`                  | uuid not null → `profiles(id)` on delete cascade (bỏ `default auth.uid()`) |
| `story_id`                 | uuid not null → `stories(id)` on delete cascade                            |
| `score`                    | smallint not null, check 1–5                                               |
| `created_at`, `updated_at` | timestamptz not null default `now()`                                       |

- Khóa chính `(user_id, story_id)`: mỗi người một điểm cho mỗi truyện.
- Index `ratings_story_id_idx`.

## Trigger giữ ở DB

Chép từ bản mới nhất của Supabase (`counters_skip_deleted_story`). Cùng lý do với số người theo dõi: đây là số liệu suy ra.

| Trigger                                    | Việc                                                                                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ratings_set_updated_at`                   | `set_updated_at()` chung                                                                                                                                                                       |
| `ratings_count` (sau khi thêm / sửa / xóa) | Cập nhật phân bố sao `story_stats.rating_counts`: bớt điểm cũ, thêm điểm mới. Truyện đã bị xóa theo cascade thì bỏ qua. `rating_count`, `rating_sum`, `rating_avg` là cột sinh nên tự đổi theo |

## API

| Endpoint                          | Việc                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /v1/stories/:slug/rating`    | Điểm của mình: `{ score }`, chưa chấm thì `score: null`. Cần đăng nhập                  |
| `PUT /v1/stories/:slug/rating`    | Body `{ score }` (1–5), chấm lại thì thay điểm cũ → `{ score }`. Cần **xác nhận email** |
| `DELETE /v1/stories/:slug/rating` | Xóa điểm của mình → 204 (chưa chấm cũng 204). Chỉ cần đăng nhập                         |

- **Truyện không xem được** (`canViewStory`) → 404.
- **Chấm điểm truyện chưa công khai** → 409 `story_not_public`. Vd chủ truyện xem trước bản nháp, quản trị viên xem truyện chờ duyệt.
  - Như policy `ratings_insert_own` / `ratings_update_own`: chỉ chấm truyện `visibility = 'published'`.
  - Web đang báo "Truyện này chưa công khai hoặc đã bị gỡ, nên chưa chấm điểm được".
- **Chủ truyện tự chấm truyện của mình:** Supabase không chặn, BE giữ như vậy.
- Không có hạn mức riêng (Supabase không có); throttler chung chặn spam.

### Mã lỗi mới

| Mã                 | Status | Khi nào                                                                                                      |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| `story_not_public` | 409    | Ghi (chấm điểm; bình luận, thích, báo cáo ở các phần sau) vào truyện người gọi xem được nhưng chưa công khai |

## Thiết kế

- **Module mới `src/modules/ratings/`:** controller, service, repository, DTO.
  - Import `StoriesModule` để tìm truyện, xét quyền xem.
  - Không đặt vào module `library`, vì chấm điểm là thao tác công khai, không thuộc tủ truyện.
- **Chấm:** `insert ... on conflict (user_id, story_id) do update set score`.
  - Trigger tự sửa phân bố sao: đổi điểm thì bớt điểm cũ, thêm điểm mới.
  - Chấm lại đúng điểm cũ thì trigger bớt rồi thêm lại cùng ô, kết quả không đổi.

## Kiểm tra

- **e2e:**
  - **Chấm:**
    - chấm 4 → `ratingCounts` [0,0,0,1,0], `ratingAvg` 4;
    - đổi sang 2 → [0,1,0,0,0];
    - chấm lại 2 → không đổi;
    - người khác chấm 5 → trung bình 3.5;
    - xóa → về 0;
    - đọc điểm của mình đúng theo từng bước.
  - **Quyền:**
    - chưa xác nhận email → 403 (xóa vẫn được);
    - chưa đăng nhập → 401;
    - truyện nháp của người khác → 404;
    - chủ truyện chấm truyện nháp của mình → 409 `story_not_public`.
  - **Dữ liệu sai:** `score` 0, 6, 2.5, `"5"` → 400.
  - **Xóa tài khoản người chấm:** phân bố sao giảm theo; xóa truyện không lỗi.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - migration khớp schema;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Chấm điểm truyện: chấm, đổi, xóa; trigger phân bố sao".
