# Phần 18: Báo lỗi chương, tin nhắn liên hệ

Trạng thái: ✅ xong (14/10/2026).

## Mục tiêu

Thay phần góp ý của web (`features/feedback/api.remote.ts`) và đóng đợt 2:

| Web                                              | BE                                                |
| ------------------------------------------------ | ------------------------------------------------- |
| `reportChapter` (RPC `report_chapter`)           | `POST /v1/stories/:slug/chapters/:number/reports` |
| `sendContactMessage` (insert `contact_messages`) | `POST /v1/contact-messages`                       |

- Chủ truyện xem và xử lý báo lỗi làm ở đợt 3 (Sáng tác).
- Quản trị viên xem hộp thư làm ở đợt 5.

## Bảng (lấy đúng từ Supabase)

### `chapter_reports`

Bản cuối sau migration `activity`, `advisor_fixes`.

| Cột                          | Định nghĩa                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `id`                         | uuid, khóa chính                                                                    |
| `story_id`, `chapter_number` | Khóa ngoại ghép → `chapters(story_id, number)` on delete cascade, on update cascade |
| `reporter_id`                | uuid not null → `profiles(id)` on delete cascade (bỏ `default auth.uid()`)          |
| `reason`                     | enum `report_reason`: `typo` \| `missing` \| `order` \| `violation` \| `other`      |
| `note`                       | text not null default `''`, check ≤ 500                                             |
| `status`                     | `report_status` (phần 17) not null default `open`                                   |
| `created_at`                 | timestamptz not null default `now()`                                                |
| `resolved_at`                | timestamptz                                                                         |

- Check `chapter_reports_check`: lý do `other` thì phải có ghi chú.
- Index:
  - unique một phần `chapter_reports_open_unique (reporter_id, story_id, chapter_number, reason) where status = 'open'`: gộp báo lỗi trùng;
  - `chapter_reports_story_status_created_idx (story_id, status, created_at desc)`;
  - `chapter_reports_reporter_id_idx`;
  - `chapter_reports_story_chapter_idx (story_id, chapter_number)`.
- Hai trigger của Supabase chuyển vào service đợt 3, khi chủ truyện đổi trạng thái:
  - `chapter_reports_set_resolved_at`: đổi trạng thái thì đặt / bỏ `resolved_at`;
  - `chapter_reports_touch`: báo lại thì `created_at = now()`, phần này làm luôn ở đây.

### `contact_messages`

Bản cuối sau migration `activity`, `rate_limits_and_account_deletion`, `admin_inbox_and_reports`.

| Cột          | Định nghĩa                                                               |
| ------------ | ------------------------------------------------------------------------ |
| `id`         | bigint, sinh tự động (`generated always as identity`), khóa chính        |
| `user_id`    | uuid → `profiles(id)` on delete set null (khách: null)                   |
| `name`       | text not null, check 2–60                                                |
| `email`      | text not null, check ≤ 254 và dạng `^[^@\s]+@[^@\s]+\.[^@\s]+$`          |
| `topic`      | enum `contact_topic`: `general` \| `bug` \| `copyright` \| `partnership` |
| `message`    | text not null, check 10–2000                                             |
| `created_at` | timestamptz not null default `now()`                                     |
| `ip_hash`    | text: hash IP người gửi (không lưu IP gốc)                               |
| `handled_at` | timestamptz: quản trị viên đánh dấu đã xử lý (đợt 5)                     |

Index:

- `contact_messages_user_id_idx`;
- `contact_messages_email_created_at_idx (email, created_at desc)`;
- `contact_messages_ip_hash_created_at_idx (ip_hash, created_at desc)`;
- `contact_messages_unhandled_created_at_idx (created_at desc) where handled_at is null`.

## Luật

### Báo lỗi chương (như RPC `report_chapter` và các policy của Supabase)

- Cần đăng nhập và **xác nhận email**.
- **Truyện:** phải công khai (`StoryAccessService.public`). Không xem được → 404; chưa công khai → 409 `story_not_public`.
- **Chương:** phải đã xuất bản, không thì 404.
- **Cùng người, cùng chương, cùng lý do mà báo lỗi cũ còn mở:** chỉ cập nhật ghi chú, đưa lên đầu (`created_at = now()`). Không tính vào hạn mức.
- **Hạn mức:** báo lỗi mới tối đa 10 / giờ mỗi người → 429.
- **Body `{ reason, note? }`:**
  - `note` bỏ khoảng trắng hai đầu, tối đa 500 ký tự;
  - bắt buộc khi `reason = other`.
- **Trả về** báo lỗi vừa ghi, giống kiểu `ChapterReport` của web: `{ id, storySlug, chapterNumber, reason, note, reporter: { id, displayName }, status, createdAt }`.

### Tin nhắn liên hệ

- **Ai gửi được:** khách và người đăng nhập (ghi `user_id`). Không cần xác nhận email.
- **Hạn mức** (như trigger `contact_messages_rate_limit`):
  - 3 tin / giờ cho mỗi email (không phân biệt hoa thường);
  - 5 tin / giờ cho mỗi IP;
  - vượt → 429.
- **`ip_hash`** = HMAC-SHA256 của IP với khóa bí mật `IP_HASH_SECRET`. Supabase băm SHA-256 của IP cộng chuỗi bí mật `ip_hash_salt`; không có IP thì null.
- **Body:** `name` (bỏ khoảng trắng, 2–60), `email` (chuẩn hóa, ≤ 254), `topic`, `message` (bỏ khoảng trắng, 10–2000).
- **Trả 204:** người gửi không đọc lại được, như Supabase.
- **Không thêm captcha** (Supabase không có). Nếu bị spam thì gắn `@RequireCaptcha()` sau.

### Băm IP dùng chung (`common/crypto`)

- **`IpHashService.hash(ip)`:** HMAC-SHA256 hex với `IP_HASH_SECRET`.
- **Biến môi trường mới `IP_HASH_SECRET`:**
  - production bắt buộc, ít nhất 32 ký tự;
  - dev / test để trống thì dùng giá trị mặc định cố định.
- **Lượt đọc (phần 10)** đổi sang dùng `IpHashService`, thay SHA-256 trần: IPv4 chỉ có 2³² giá trị nên dễ dò ngược nếu không có khóa.
- **Thêm vào:** schema env, `.env.example`, test của schema, job `docker` của CI (chạy ở chế độ production).

### Mã lỗi

Không có mã mới. Dùng `not_found`, `story_not_public`, `rate_limited`, `validation_failed` (`requiredForOther`).

## Bố cục

- **Module mới `src/modules/feedback/`** (như `features/feedback` của web):
  - `controllers/`: `chapter-reports.controller.ts`, `contact.controller.ts`;
  - `services/`, `repositories/` tương ứng;
  - mapper, DTO.
- Dùng lại `ChapterParamsDto` của module `chapters`.

## Kiểm tra

- **e2e báo lỗi chương:**
  - báo lỗi → 201, đủ trường;
  - báo lại cùng lý do → cập nhật ghi chú, cùng `id`, không thêm dòng;
  - khác lý do → dòng mới.
  - **Quyền:**
    - chưa xác nhận email → 403;
    - truyện nháp của người khác → 404;
    - chủ truyện báo lỗi bản nháp → 409;
    - chương nháp, chương không có → 404.
  - **Dữ liệu:** `other` thiếu ghi chú, lý do lạ → 400.
  - **Hạn mức:** báo lỗi mới thứ 11 → 429; báo lại vẫn được.
  - **Cascade:** xóa chương thì báo lỗi mất theo.
- **e2e liên hệ:**
  - khách gửi → 204, dòng có `ip_hash` (không phải IP gốc), `user_id` null;
  - người đăng nhập → có `user_id`.
  - **Hạn mức:**
    - email thứ 4 trong giờ (khác hoa thường) → 429;
    - IP thứ 6 → 429.
  - **Dữ liệu sai:** tên 1 ký tự, email sai, chủ đề lạ, nội dung 9 ký tự → 400.
- **Unit:**
  - `IpHashService` (cùng IP cùng hash, khác khóa khác hash);
  - schema env (production thiếu `IP_HASH_SECRET` → lỗi).
- **Kiểm tra chung:**
  - lint, typecheck, format, build, test;
  - migration khớp schema;
  - `openapi.json` export lại;
  - CI xanh, kể cả job Docker.
- Xong thì đánh dấu đợt 2 ✅ trong lộ trình.

## Commit

"Báo lỗi chương, tin nhắn liên hệ, băm IP có khóa; đóng đợt 2".
