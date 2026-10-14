# Phần 12: Tìm kiếm, bảng xếp hạng, truyện liên quan

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- **Ngày đầu kỳ xếp hạng tính trong SQL:** `day > (now() at time zone 'Asia/Ho_Chi_Minh')::date - 7` (hoặc `- 30`), giống hệt `story_ranking` của Supabase, nên không cần hàm TypeScript và test unit riêng. Test e2e kiểm tra đúng ranh giới: lượt của 6 ngày trước tính vào tuần, 7 ngày trước thì không.
- `ranking` và `related` nằm ở repository riêng `StoryRankingRepository` (chỉ trả id + giá trị). `stories.repository.ts` chuyển vào `repositories/`.

## Mục tiêu

Thay các RPC đọc còn lại của Supabase và đóng đợt 1:

| Supabase / web                                                                   | BE                              |
| -------------------------------------------------------------------------------- | ------------------------------- |
| `search_stories` / `search_story_cards`; `searchStories`, `getSearchSuggestions` | `GET /v1/search`                |
| Thể loại khớp từ khóa (`genresMatching`)                                         | `GET /v1/genres?q=`             |
| `story_ranking` / `story_ranking_cards`; `getRanking`, `getTrendingWeekly`       | `GET /v1/ranking`               |
| `related_stories` / `related_story_cards`; `getRelatedStories`                   | `GET /v1/stories/:slug/related` |

Mọi kết quả chỉ gồm truyện công khai có ít nhất một chương đã xuất bản (`isPublicStory`).

## API

### `GET /v1/search?q=&page=&pageSize=` (public)

- **Chấm điểm như `search_stories`** (và `matchScore` của web), không phân biệt dấu (so trên `slugify`):

  | Điểm | Khi                                                                      |
  | ---- | ------------------------------------------------------------------------ |
  | 4    | Tên truyện bắt đầu bằng từ khóa                                          |
  | 3    | Tên truyện chứa từ khóa                                                  |
  | 2    | Tên truyện chứa đủ các từ                                                |
  | 1    | Tên tác giả hiển thị (bút danh, không có thì tên tài khoản) chứa từ khóa |

  Điểm 0 thì bỏ.

- **Thứ tự:** điểm, rồi lượt đọc, rồi `id`.
- **Trả về:** `@ResponsePage(StoryDto)`. Gợi ý nhanh ở ô tìm kiếm dùng `?pageSize=5`.
- **`q`:**
  - bắt buộc, tối đa 100 ký tự (dài hơn → 400);
  - `slugify(q)` rỗng (vd `!!!`) → trang rỗng, không lỗi, như web.
- Không cache, vì từ khóa thay đổi theo từng người gõ.

### `GET /v1/genres?q=` (thêm vào phần 7)

- Thể loại có slug chứa `slugify(q)` (như `genresMatching` của web). Thứ tự như danh sách thể loại hiện có.
- `slugify(q)` rỗng → trang rỗng.

### `GET /v1/ranking?by=&period=&limit=` (public)

- **`by`:** `views` (mặc định) \| `rating` \| `follows`. `votes` thêm ở đợt 4, khi có bảng `story_votes`.
- **`period`:** `week` (mặc định) \| `month` \| `all`. Chỉ có tác dụng với `views`.
- **`limit`:** 1–100, mặc định 50.
- **Cách tính** (như `story_ranking` của Supabase):

  | `by`                      | Xếp theo                                                                                                                                                  | `value`                             |
  | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
  | `views`, `week` / `month` | Tổng `chapter_views` của 7 / 30 ngày gần nhất (giờ Việt Nam, tính cả hôm nay)                                                                             | Số lượt đọc trong kỳ                |
  | `views`, `all`            | `view_count` > 0                                                                                                                                          | `view_count`                        |
  | `rating`                  | Điểm có trọng số: `(rating_sum + mean × 50) / (rating_count + 50)`. `mean` là điểm trung bình của mọi truyện có lượt chấm (`RATING_PRIOR` = 50 lượt "ảo") | Điểm trung bình thật (`rating_avg`) |
  | `follows`                 | `follower_count` > 0                                                                                                                                      | Số người theo dõi                   |

  Chỉ lấy truyện có số liệu (> 0); bằng nhau thì theo `id`.

- **Trả về:** `@ResponseDto(RankedStoryDto, { isArray: true })`, mỗi phần tử `{ value, story }`. `Cache-Control: public, max-age=60`.
- **"Top tuần" ở trang chủ:** `?by=views&period=week&limit=10`.

### `GET /v1/stories/:slug/related?limit=` (public)

- **Xếp hạng như `related_stories`:**
  - nhiều thể loại trùng nhất, rồi nhiều lượt đọc nhất, rồi `id`;
  - bỏ truyện cùng chủ truyện.
- **`limit`:** 1–50, mặc định 6.
- **Truyện gốc không xem được** (`canViewStory`) → 404. Truyện gốc không có thể loại → mảng rỗng.
- **Trả về:** `@ResponseDto(StoryDto, { isArray: true })`.

## Thiết kế

- **Truy vấn** ở `StoriesRepository`, dùng lại `selectCards` và `isPublicStory`:
  - `search(q, window)` + `searchCount(q)`: điểm là biểu thức `case` trên `search_title`; tên tác giả so bằng hàm SQL `slugify`;
  - `ranking(by, period, limit)`: trả `{ value, card }`;
  - `related(storyId, ownerId, limit)`.
- **Module `stories`:**
  - controller `search.controller.ts` (`/v1/search`), `ranking.controller.ts` (`/v1/ranking`); `related` nằm trong `StoriesController`;
  - service `story-search.service.ts`, `story-ranking.service.ts`; `related` nằm trong `StoriesService`;
  - DTO: `SearchQueryDto`, `RankingQueryDto`, `RelatedQueryDto`, `RankedStoryDto`.
- **Hằng số:** `RATING_PRIOR = 50`, `RANKING_PERIOD_DAYS = { week: 7, month: 30 }`, `MAX_SEARCH_QUERY = 100`.
- **Ngày đầu kỳ:** tính từ `vietnamDate()`: hôm nay theo giờ Việt Nam, lùi 6 / 29 ngày.

## Kiểm tra

DB dùng chung giữa các file test. Test dùng từ khóa riêng (chuỗi ngẫu nhiên trong tên truyện), hoặc đặt số liệu vượt trội rồi chỉ xét thứ tự các truyện của test trong kết quả.

- **e2e:**
  - **Tìm kiếm:**
    - đủ 4 mức điểm theo đúng thứ tự;
    - cùng điểm thì nhiều lượt đọc trước;
    - không dấu, hoa thường (`dau pha` khớp "Đấu Phá");
    - khớp bút danh;
    - không có truyện nháp;
    - phân trang `meta`;
    - `q=!!!` → trang rỗng; thiếu `q`, `q` quá dài → 400.
  - **Thể loại `q`:** chỉ thể loại khớp, không dấu.
  - **Xếp hạng:**
    - lượt đọc theo tuần chỉ tính `chapter_views` trong 7 ngày (ghi thẳng lượt của 8 ngày trước thì không tính), tháng 30 ngày;
    - `all` theo `view_count`;
    - `rating` dùng điểm có trọng số: truyện 5 sao với 1 lượt chấm đứng sau truyện 4,8 sao với 1000 lượt; `value` là điểm thật;
    - `follows`;
    - `by=votes` → 400; `limit` > 100 → 400.
  - **Liên quan:**
    - nhiều thể loại trùng trước, rồi lượt đọc;
    - bỏ truyện cùng chủ, truyện nháp;
    - truyện gốc là nháp của người khác → 404.
- **Unit:** ngày đầu kỳ xếp hạng theo giờ Việt Nam.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - `openapi.json` export lại;
  - CI xanh.
- Xong phần này thì đánh dấu đợt 1 ✅ trong lộ trình.

## Commit

"Tìm kiếm không dấu, bảng xếp hạng, truyện liên quan; đóng đợt 1".
