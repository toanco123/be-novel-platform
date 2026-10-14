# Phần 7: Module mẫu `genres` (thể loại) và phân trang

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:** hạn mức 10 thể loại / ngày chỉ tính lần tạo thành công (giống trigger của Supabase đếm dòng đã tạo): xem còn lượt trước, tạo xong mới tính. Tạo trùng không mất lượt.

## Mục tiêu

- Module domain đầu tiên làm đủ mọi lớp (controller, service, repository, mapper, DTO, test), làm khuôn cho các module sau (truyện, chương, bình luận...).
- Thêm phân trang dùng chung (`common/pagination`). Danh sách trả `{ statusCode, data: [...], meta: { total, page, pageSize, pageCount, requestId } }`.

## Bảng `genres` (lấy đúng từ Supabase)

Theo `supabase/migrations/20260928035804_catalog.sql` của web:

| Cột           | Định nghĩa                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `slug`        | text, khóa chính, check `^[a-z0-9]+(-[a-z0-9]+)*$` (`genres_slug_check`); luôn bằng `slugify(name)` |
| `name`        | text, check 2–30 ký tự (`genres_name_check`)                                                        |
| `description` | text, check tối đa 200 ký tự (`genres_description_check`)                                           |
| `created_by`  | uuid → `profiles(id)`, `on delete set null` (null: thể loại có sẵn của hệ thống)                    |
| `created_at`  | timestamptz, mặc định `now()`                                                                       |

- Index `genres_created_by_idx (created_by)`.
- Luật ở trigger của Supabase viết lại trong service:
  - `genres_set_slug`: slug tính từ tên.
  - `genres_rate_limit`: mỗi người tối đa 10 thể loại / ngày.
- Trùng khóa chính `genres_pkey` → mã `genre_exists` (thêm vào `constraint-codes.ts`).

## API

| Endpoint                  | Việc                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/genres` (public) | `?page=1&pageSize=20` (tối đa 100). Thứ tự như web: thể loại có sẵn trước, rồi thể loại người dùng tạo theo thời gian tạo, cùng lúc thì theo tên. `Cache-Control: public, max-age=60`                                                                                                                                                                                                                                         |
| `GET /v1/genres/:slug`    | Một thể loại; không có → 404 `not_found`                                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /v1/genres`         | Cần đăng nhập và **đã xác nhận email** (`@RequireVerifiedEmail`, thao tác viết theo quyết định ở phần 5). `{ name, description? }`. Tên chuẩn hóa như `normalizeGenreName` của web (bỏ khoảng trắng thừa, viết hoa chữ đầu). Slug rỗng → 400 `validation_failed`. Trùng slug → 409 `genre_exists`, `details.genre` là thể loại đang có. Quá 10 thể loại / ngày → 429 `rate_limited`; quản trị viên không bị giới hạn. Trả 201 |

- **Dữ liệu trả về (`GenreDto`):** `{ slug, name, description, createdBy: { id, displayName } | null, createdAt }`, giống cột của view `genre_cards`.
- `storyCount` thêm khi có module truyện.
- Sửa, xóa, gộp thể loại (quản trị) làm ở đợt quản trị.

## Phân trang (`common/pagination`)

- **`PageQueryDto`:** `page` (≥ 1, mặc định 1), `pageSize` (1–100, mặc định 20); query là chuỗi nên đổi sang số bằng `@Type(() => Number)`.
- **Kiểu `Page<T>`:** `{ items, total, page, pageSize }` là thứ service trả. Hàm `pageOffset(query)` tính `offset` / `limit` cho repository.
- **`@ResponsePage(Dto)`** (cùng `ResponseInterceptor`):
  - `data` là mảng đã lọc theo DTO.
  - `meta` gồm `total`, `page`, `pageSize`, `pageCount`, `requestId`.
  - Swagger có schema tương ứng (`PageMetaDto`).
- **Bố cục:** `common/response/` có từ 3 decorator trở lên, nên gom vào `common/response/decorators/` (theo quy tắc gom thư mục).

## Dùng chung

- `slugify` ở `common/utils/slugify.ts`, giống hệt `src/lib/slugify.ts` của web: bỏ dấu, `đ` → `d`, chữ thường, ký tự khác chữ / số thành `-`.

## Kiểm tra

- **Unit:**
  - `slugify` (các ví dụ của web);
  - `normalizeGenreName`;
  - tính `offset` / `pageCount`.
- **e2e:**
  - Khách xem danh sách và một thể loại; có `Cache-Control`; phân trang đúng `meta`.
  - Tạo thể loại:
    - chưa đăng nhập → 401;
    - chưa xác nhận email → 403 `email_not_verified`;
    - hợp lệ → 201, có `createdBy`.
  - Trùng (khác dấu / hoa thường, vd "ngôn tình" và "Ngon Tinh") → 409 kèm `details.genre`.
  - Tên chỉ có ký tự đặc biệt → 400.
  - Thể loại thứ 11 trong ngày → 429; quản trị viên không bị giới hạn.
  - Xóa người tạo → `createdBy` thành null.
- lint, typecheck, format, build, test; migration khớp schema; `openapi.json` export lại.

## Commit

"Module genres (mẫu) và phân trang dùng chung".
