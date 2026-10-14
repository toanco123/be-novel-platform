# Phần 13: Lịch sử đọc

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- Thêm `truncateChars` (`common/utils/truncate.ts`): cắt tên chương theo ký tự thật (như `char_length`), không cắt đôi emoji.
- Thứ tự lịch sử khi cùng `read_at` thì theo `story_id`, để kết quả ổn định.

## Mục tiêu

Thay phần lịch sử đọc của web (`features/library/api.remote.ts`) và các RPC `save_reading_progress`, `merge_guest_history` của Supabase:

| Web                                       | BE                                                     |
| ----------------------------------------- | ------------------------------------------------------ |
| `saveReadingProgress`                     | `PUT /v1/me/history/:slug`                             |
| `getReadingHistory`                       | `GET /v1/me/history`                                   |
| `getStoryProgress`                        | `GET /v1/me/history/:slug`                             |
| `removeFromHistory`, `clearHistory`       | `DELETE /v1/me/history/:slug`, `DELETE /v1/me/history` |
| Gộp lịch sử khách (`merge_guest_history`) | `POST /v1/me/history/merge`                            |

Lịch sử của khách vẫn lưu trên máy (web: localStorage, app: bộ nhớ máy). Đăng nhập xong thì client gửi lên để gộp.

## Bảng `reading_history` (lấy đúng từ Supabase, migration `activity`)

| Cột              | Định nghĩa                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| `user_id`        | uuid not null → `profiles(id)` on delete cascade (bỏ `default auth.uid()`) |
| `story_id`       | uuid not null → `stories(id)` on delete cascade                            |
| `chapter_number` | integer not null, check 1–99999                                            |
| `chapter_title`  | text not null default `''`, check ≤ 120                                    |
| `progress`       | real not null default 0, check 0–1 (tỉ lệ đã cuộn trong chương)            |
| `read_at`        | timestamptz not null default `now()`                                       |

- Khóa chính `(user_id, story_id)`: mỗi truyện một dòng, là chỗ đọc dở.
- Index:
  - `reading_history_user_id_read_at_idx (user_id, read_at desc)`;
  - `reading_history_story_id_idx (story_id)`.
- **Không có khóa ngoại tới chương:** lịch sử vẫn còn khi tác giả ẩn hoặc xóa chương.
- Trigger `reading_history_bump_seen` (đọc xa hơn thì nâng mốc "đã thấy" của truyện đang theo dõi) làm ở phần 14, cùng bảng `follows`.

## API

Mọi route cần đăng nhập. **Không cần xác nhận email**, vì lịch sử là dữ liệu riêng của mình.

| Endpoint                      | Việc                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PUT /v1/me/history/:slug`    | Body `{ chapter, chapterTitle?, progress? }` → chỗ đọc dở mới                                          |
| `GET /v1/me/history?limit=`   | Lịch sử, mới đọc trước: `[{ story, progress }]`. `limit` 1–100, mặc định 100 (`HISTORY_LIMIT` của web) |
| `GET /v1/me/history/:slug`    | Chỗ đọc dở của một truyện; chưa đọc thì `data: null`                                                   |
| `DELETE /v1/me/history/:slug` | Xóa một truyện khỏi lịch sử → 204 (chưa có cũng 204)                                                   |
| `DELETE /v1/me/history`       | Xóa hết → 204                                                                                          |
| `POST /v1/me/history/merge`   | Body `{ entries: [{ slug, chapter, chapterTitle?, progress?, readAt? }] }`, tối đa 100 dòng → 204      |

### `PUT /v1/me/history/:slug` (như `save_reading_progress`)

- **Truyện không xem được** (`canViewStory` của phần 9) → 404.
- **Ghi đè** chương, tên chương, tiến độ; `read_at = now()`.
  - Không gửi `progress` mà vẫn là chương cũ thì giữ tiến độ cũ. Web gửi khi vừa mở chương, nên quay lại chương đang đọc không bị về đầu.
  - Đổi chương mà không gửi `progress` thì tiến độ về 0.
- `chapterTitle` cắt còn 120 ký tự; `progress` kẹp vào 0–1.
- **Không kiểm tra chương có tồn tại:** Supabase cũng không kiểm tra, và lịch sử không gắn khóa ngoại với chương.

### Gộp lịch sử khách (như `merge_guest_history`)

- Mỗi truyện lấy dòng có `readAt` mới nhất.
- Chỉ ghi đè khi `readAt` mới hơn dòng đang có trên máy chủ.
- `readAt` sau thời điểm hiện tại thì coi là bây giờ; thiếu `readAt` cũng coi là bây giờ.
- **Slug không có, truyện không xem được** → bỏ qua dòng đó, không lỗi.
- **Sai kiểu** (chương ngoài 1–99999, `progress` ngoài 0–1, `readAt` không phải ngày giờ) → 400 cả request. Client phải lọc dữ liệu trên máy trước khi gửi.

### Dữ liệu trả về

- `ReadingProgressDto` (giống `ReadingProgress` của web): `{ slug, chapter, chapterTitle, progress, readAt }`.
- `HistoryItemDto`: `{ story: StoryDto, progress: ReadingProgressDto }`.
- Lịch sử chỉ gồm truyện người gọi còn xem được: truyện bị ẩn, bị gỡ thì tạm không hiện, như RLS của Supabase.

## Thiết kế

- **Module mới `src/modules/library/`** (tủ truyện, lịch sử; phần 14 thêm theo dõi):
  - `history.controller.ts`, `history.service.ts`, `history.repository.ts`, mapper, DTO;
  - import `StoriesModule` để tìm truyện, xét quyền xem, dựng thẻ truyện.
- **Điều kiện "truyện người gọi xem được" viết bằng SQL**, dùng cho danh sách lịch sử và gộp lịch sử: `isVisibleStory(actor)`.
  - Cùng luật với `canViewStory`: công khai, của mình, hoặc chờ duyệt với quản trị viên.
  - File `modules/stories/public-story.ts` đổi thành `story-conditions.ts`, chứa `isPublicStory()` và `isVisibleStory(actor)`.
- **`@ResponseDto(Dto, { nullable: true })`:** response có thể là `data: null`, Swagger ghi đúng.
- **Ghi chỗ đọc** bằng một câu `insert ... on conflict (user_id, story_id) do update`, giữ tiến độ cũ theo điều kiện trên.
- **Gộp** cũng bằng một câu insert:
  - lấy từ các dòng client gửi, nối với `stories` theo slug, chỉ truyện xem được;
  - `distinct on` truyện để giữ dòng mới nhất;
  - `on conflict ... do update ... where excluded.read_at > reading_history.read_at`.

## Kiểm tra

- **e2e:**
  - **Lưu chỗ đọc:**
    - lưu → đọc lại đúng;
    - cùng chương, không gửi `progress` → giữ tiến độ;
    - đổi chương → tiến độ 0;
    - `progress` 1.5 → 400;
    - tên chương dài → cắt 120.
  - **Quyền:**
    - truyện nháp của người khác, slug không có → 404;
    - chưa đăng nhập → 401;
    - chưa xác nhận email vẫn lưu được.
  - **Danh sách:**
    - mới đọc trước, `limit`;
    - truyện bị ẩn sau khi đọc thì không hiện;
    - chỉ thấy lịch sử của mình.
  - **Một truyện:** chưa đọc → `data: null`.
  - **Xóa:** một truyện, xóa hết.
  - **Gộp:**
    - truyện chưa có → thêm;
    - máy chủ mới hơn → giữ của máy chủ;
    - khách mới hơn → ghi đè;
    - hai dòng cùng truyện → lấy dòng mới nhất;
    - `readAt` tương lai → bây giờ;
    - slug lạ bỏ qua;
    - quá 100 dòng → 400.
  - **Xóa tài khoản, xóa truyện:** lịch sử mất theo (cascade).
- **Unit:** mapper.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - migration khớp schema;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Lịch sử đọc: lưu chỗ đọc dở, danh sách, xóa, gộp lịch sử khách".
