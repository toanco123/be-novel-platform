# Phần 10: Chương cho người đọc và ghi lượt đọc

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:** `count` của `/contents` không bắt buộc, mặc định 20 (mức tối đa).

## Mục tiêu

Thay các hàm đọc chương của web (`features/chapters/api.remote.ts`) và RPC `record_chapter_view` của Supabase:

| Web                 | Việc                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| `getChapterList`    | Mục lục của truyện, phân trang, thứ tự tăng / giảm                                  |
| `getChapter`        | Một chương kèm thông tin truyện và chương trước / sau                               |
| `getChapterRange`   | Tải nhiều chương một lần: tải trước 5 chương, tải về đọc offline từng đợt 20 chương |
| `countChaptersFrom` | Số chương từ chương N trở đi                                                        |
| `recordChapterView` | Ghi lượt đọc                                                                        |

## Luật (giống Supabase)

- **Ai đọc được chương:** ai xem được truyện (`canViewStory` của phần 9) thì đọc được chương **đã xuất bản** của truyện đó.
  - Chủ truyện xem trước truyện nháp, quản trị viên xem truyện chờ duyệt: cũng chỉ thấy chương đã xuất bản.
  - Chương nháp không bao giờ hiện ở trang đọc và mục lục (như web lọc `status = 'published'`).
- **Không xem được truyện, chương không có hoặc chưa xuất bản** → 404 `not_found`. Web trước đây trả trang rỗng; app chỉ cần đổi cách hiểu 404.
- **Chương trước / sau** tính theo chương đã xuất bản liền kề (số chương có thể không liền nhau), không phải ±1.
- **Lượt đọc** (như `private.record_chapter_view`):
  - chỉ tính chương đã xuất bản của truyện **đang công khai**;
  - không tính lượt của chủ truyện;
  - mỗi người một lượt / chương / ngày (giờ Việt Nam). Người đăng nhập tính theo id, khách theo IP.
  - Tính được lượt mới thì cộng `chapter_views` (theo ngày) và `story_stats.view_count` trong một transaction.

## API

| Endpoint                                                 | Việc                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/stories/:slug/chapters` (public)                | Mục lục. Query: `page`, `pageSize` (1–100, mặc định 20; web dùng 50), `order` (`asc` mặc định \| `desc`), `from` (chỉ chương có số ≥ `from`). Item: `{ number, title, publishedAt }`. `meta.total` = số chương thỏa điều kiện, nên `?from=N&pageSize=1` thay `countChaptersFrom` |
| `GET /v1/stories/:slug/chapters/contents` (public)       | Nhiều chương liên tiếp đã xuất bản từ số `from` (≥ `from`, tăng dần), tối đa `count` (1–20) chương. Mỗi phần tử giống `GET …/chapters/:number`. Truyện không xem được → 404; hết chương → mảng rỗng                                                                              |
| `GET /v1/stories/:slug/chapters/:number` (public)        | Một chương: `{ story, number, title, content, publishedAt, prev, next }`                                                                                                                                                                                                         |
| `POST /v1/stories/:slug/chapters/:number/views` (public) | Ghi lượt đọc → 204 (kể cả khi lượt bị bỏ qua: lặp trong ngày, chủ truyện, truyện chưa công khai mà người gọi xem được). Chương không đọc được → 404                                                                                                                              |

- **`ChapterDto`** (giống kiểu `ChapterContent` của web):
  - `story: { slug, title, author, status, chapterCount, coverUrl, visibility, nextChapter }`;
  - `number`, `title`, `content` (HTML rút gọn hoặc văn bản thuần, client đọc qua `parseContent`), `publishedAt`;
  - `prev`, `next`: `{ number, title }` \| null.
- **`/contents`:** `prev` của chương đầu và `next` của chương cuối cũng phải đúng. Lấy thêm một chương sau cùng để biết `next` (như web).
- **`:number`** chỉ nhận số nguyên 1–99999. Sai → 400 `validation_failed`.
- **Không đặt `Cache-Control`:** chủ truyện, quản trị viên thấy khác khách.

## Thiết kế

### Lượt đọc

- **Chống đếm lặp bằng Redis** thay bảng `private.chapter_view_log` của Supabase:
  - `SET <key> 1 NX EX 172800` (2 ngày);
  - key `views:seen:<ngày>:<storyId>:<số chương>:<người xem>`;
  - người xem là `u:<userId>`, khách là `ip:<SHA-256 của IP>`, không có IP thì `unknown` (như Supabase).
  - Redis đặt được key (lượt mới) mới ghi DB. Nhật ký này chỉ cần hôm nay và hôm qua, không cần chuyển dữ liệu, nên không tạo bảng.
- **Ghi DB** (một transaction):
  - `chapter_views`: upsert `(story_id, chapter_number, day)`, `views + 1`;
  - `story_stats.view_count + 1`.
- **Ghi DB lỗi thì xóa key Redis**, để lần mở sau tính lại (web cũng thử lại khi lỗi).
- **Ngày** theo giờ Việt Nam: `vietnamDate(date)` → `YYYY-MM-DD` (`common/utils/vietnam-date.ts`). Thống kê, điểm danh ở các đợt sau dùng lại.
- **IP** lấy từ `clientMeta(req).ip` (đã theo `TRUST_PROXY_HOPS`).

### Trả mảng không phân trang

- `@ResponseDto(Dto, { isArray: true })`: `data` là mảng đã lọc theo DTO, `meta: { requestId }`. Swagger ghi `data: array`.
- Dùng cho `/contents`; phần 11, 12 dùng tiếp (truyện chọn tay, xếp hạng, liên quan).

### Bố cục

- **Module mới `src/modules/chapters/`:**
  - `chapters.controller.ts`;
  - `services/`: `chapters.service.ts` (mục lục, đọc), `chapter-views.service.ts` (ghi lượt đọc);
  - `repositories/`: `chapters.repository.ts`, `chapter-views.repository.ts`;
  - `chapters.mapper.ts`, `chapters.types.ts`, `chapters.constants.ts`;
  - `dto/`: query mục lục, query `/contents`, `ChapterSummaryDto`, `ChapterDto`, `ReaderStoryDto`.
- **Dùng lại module `stories`** (export `StoriesRepository`, `StoriesMapper`):
  - tìm truyện theo slug, xét `canViewStory`;
  - thông tin truyện đi kèm chương lấy từ thẻ truyện.
  - Thêm `StoriesRepository.findAccessBySlug` (chỉ `id`, `visibility`, `ownerId`, `reviewStatus`) cho mục lục và lượt đọc, không cần gom thể loại.

## Kiểm tra

- **e2e:**
  - **Mục lục:**
    - chỉ chương đã xuất bản, đúng thứ tự `asc` / `desc`, phân trang;
    - `from` lọc và `meta.total` đúng;
    - truyện nháp: khách 404, chủ truyện thấy (chỉ chương đã xuất bản).
  - **Một chương:**
    - đủ trường; `prev` / `next` bỏ qua chương nháp và số bị bỏ trống;
    - chương đầu `prev = null`, chương cuối `next = null`;
    - chương nháp, số không có → 404; số sai dạng → 400.
  - **`/contents`:**
    - đúng số lượng; `prev` / `next` của chương đầu, cuối đợt;
    - `count` > 20 → 400; `from` sau chương cuối → mảng rỗng.
  - **Lượt đọc:**
    - khách gọi 2 lần trong ngày → `view_count` +1, `chapter_views` của ngày hôm nay = 1;
    - IP khác → +1;
    - người đăng nhập (cùng IP với khách) tính riêng;
    - chủ truyện không tính;
    - truyện nháp (chủ truyện xem trước) không tính;
    - chương nháp → 404.
- **Unit:**
  - `vietnamDate` (23:30 UTC là ngày hôm sau ở Việt Nam);
  - key người xem (user / IP băm / unknown);
  - mapper.
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - `openapi.json` export lại;
  - CI xanh.

## Commit

"Chương cho người đọc: mục lục, đọc chương, tải nhiều chương, ghi lượt đọc".
