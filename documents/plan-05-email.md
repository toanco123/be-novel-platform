# Phần 5: Email, mật khẩu, captcha, xóa tài khoản

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- **`profiles` khớp Supabase** (người dùng yêu cầu: bảng có trên Supabase thì lấy đúng từ Supabase):
  - `display_name` check 1–30 ký tự, `avatar_url` tối đa 2048, tên constraint `profiles_display_name_check`, `profiles_avatar_url_check` (migration `0004_profiles_match_supabase`).
  - DTO tên hiển thị 2–30 ký tự như form của web (trước đây 2–50).
- **Kiểm tra mật khẩu hiện tại** (đổi mật khẩu, xóa tài khoản) dùng chung `PasswordConfirmationService` ở module users; sai 5 lần / 15 phút → `rate_limited`. Module users gom service vào `services/`.
- **Quên mật khẩu** gửi thư chạy nền sau khi trả lời, để thời gian trả lời như nhau dù email có tài khoản hay không.
- **Captcha:** Cloudflare không trả lời thì 503 `service_unavailable` (không cho qua).
- **Tên sản phẩm trong thư** là `APP_NAME` (`src/app.constants.ts`, "Web Truyện" như `SITE_NAME` của web); `MAIL_FROM` mặc định `Web Truyện <no-reply@novel.local>`.
- **Production** bắt buộc đặt `SMTP_URL`, `APP_WEB_URL` khác localhost.
- **Mật khẩu yếu** báo mã riêng `hasLetter` / `hasDigit` (không dùng `matches` chung).
- **Bố cục:**
  - Module auth tách `controllers/`, `repositories/`, `templates/`.
  - `common/validation/decorators/` (transform, mật khẩu mới).
  - `escapeHtml` ở `common/utils/`.

## Mục tiêu

- **Email:** xác nhận email, quên và đặt lại mật khẩu. Email gửi qua hàng đợi BullMQ `mail`, process worker gửi. Ở local xem thư trong Mailpit.
- **Mật khẩu:** đổi mật khẩu khi biết mật khẩu cũ. Luật mật khẩu mới giống web.
- **Captcha Turnstile** cho các form như web và app đang dùng.
- **Xóa tài khoản:** `DELETE /v1/me`.

Đã chốt với người dùng (14/10/2026):

| Việc                                 | Quyết định                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chưa xác nhận email                  | **Đăng nhập được ngay.** Thao tác viết ở các phần sau (đăng truyện, bình luận...) gắn `@RequireVerifiedEmail()`, chưa xác nhận thì 403 `email_not_verified` |
| Mật khẩu mới (đăng ký, đặt lại, đổi) | **Giống web:** 8–72 ký tự, có ít nhất một chữ cái và một chữ số. Đăng nhập không kiểm tra luật này (user cũ vẫn vào được)                                   |
| Đổi mật khẩu xong                    | **Đăng xuất các thiết bị khác**, giữ phiên đang dùng                                                                                                        |

Giữ như web hiện tại:

- Đặt lại mật khẩu xong thì đăng xuất mọi thiết bị.
- Quên mật khẩu luôn trả 204, không lộ email có tồn tại hay không.
- Xóa tài khoản: tài khoản có mật khẩu thì nhập mật khẩu; tài khoản chỉ dùng Google / Facebook (phần 6) thì gõ lại email.

## Thiết kế

### Bảng `email_tokens` (migration mới)

| Cột            | Ghi chú                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `id` uuid      |                                                                          |
| `user_id`      | FK → `users`, cascade                                                    |
| `purpose`      | enum `email_token_purpose`: `verify_email` \| `reset_password`           |
| `email` citext | Email lúc gửi; email tài khoản đổi (sau này) thì link cũ vô hiệu         |
| `token_hash`   | unique; SHA-256 của token (`hashToken`), client giữ chuỗi gốc trong link |
| `expires_at`   | Hạn: xác nhận email 24 giờ, đặt lại mật khẩu 1 giờ                       |
| `used_at`      | Dùng một lần                                                             |
| `created_at`   |                                                                          |

- Index `(user_id, purpose)`.
- Gửi link mới cùng mục đích thì link cũ chưa dùng hết hiệu lực (ghi `used_at`).

### Gửi mail (`src/infra/mail`)

- **Thư viện:** `nodemailer`, nối SMTP qua `SMTP_URL`.
  - Local: Mailpit trong docker-compose (SMTP cổng 1025, giao diện http://localhost:8025).
  - Production: SMTP của nhà cung cấp chọn sau (Resend, SES, Brevo... đều có SMTP).
- **Hàng đợi `mail`, job `send`:**
  - API dựng sẵn thư (`{ to, subject, html, text }`) rồi đẩy vào hàng đợi.
  - Worker (`MailProcessor`) gửi; lỗi thì thử lại 3 lần, ghi log bằng `ErrorLogger`.
  - Request không phải chờ SMTP.
- **Nội dung thư** (tiếng Việt, HTML + text) ở `modules/auth/templates/`.
  - Link về web: `APP_WEB_URL/auth/verify-email?token=…`, `APP_WEB_URL/auth/reset-password?token=…`.
  - Hai trang này làm khi chuyển web sang BE. Mobile mở bằng universal link ở đợt đó.

### Captcha Turnstile (`src/common/captcha`)

- `CaptchaService.verify(token, ip)` gọi `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
  - Không đặt `TURNSTILE_SECRET` thì tắt captcha (như web: dev, test).
  - Sai hoặc thiếu token thì 400 `invalid_captcha`.
- `@RequireCaptcha()` (guard) đọc `captchaToken` (hoặc `captcha_token`) trong body.
- DTO có captcha kế thừa `CaptchaDto` để Swagger hiện trường `captchaToken`.
- **Dùng cho:** đăng ký, đăng nhập, quên mật khẩu, đổi mật khẩu, xóa tài khoản (giống web và app).

### Xác nhận email đi vào access token

- Thêm claim `ev` (email đã xác nhận) vào access token; `Actor` có `emailVerified`.
- `@RequireVerifiedEmail()` + guard: không truy vấn DB, đọc `actor.emailVerified`. Chưa xác nhận thì 403 `email_not_verified`.
- Xác nhận xong, client gọi `/v1/auth/refresh` để nhận access token mới có `ev = true`. Token cũ còn nhiều nhất 15 phút.

### API

| Endpoint                                 | Việc                                                                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/auth/register` (đổi)           | Thêm captcha, luật mật khẩu mới; tạo tài khoản xong gửi thư xác nhận                                                                                                                                                               |
| `POST /v1/auth/login` (đổi)              | Thêm captcha                                                                                                                                                                                                                       |
| `POST /v1/auth/verify-email` (public)    | `{ token }` → đánh dấu đã xác nhận, 204. Link sai, hết hạn, đã dùng → 400 `invalid_link`                                                                                                                                           |
| `POST /v1/auth/resend-verification`      | Cần đăng nhập. Gửi lại thư xác nhận, 204; đã xác nhận thì 204, không gửi. 3 lần / giờ / người                                                                                                                                      |
| `POST /v1/auth/forgot-password` (public) | `{ email, captchaToken }` → luôn 204. Có tài khoản thì gửi thư. 3 lần / giờ theo email, 10 lần / giờ theo IP                                                                                                                       |
| `POST /v1/auth/reset-password` (public)  | `{ token, password }` → đặt mật khẩu mới, đánh dấu email đã xác nhận (đã chứng minh có hộp thư), thu hồi mọi phiên, 204. Link sai → 400 `invalid_link`                                                                             |
| `POST /v1/auth/change-password`          | Cần đăng nhập. `{ currentPassword, newPassword, captchaToken }`. Sai mật khẩu cũ → 401 `invalid_credentials` (tính vào hạn mức đăng nhập sai); mới trùng cũ → 400 `same_password`. Thu hồi các phiên khác, giữ phiên hiện tại, 204 |
| `DELETE /v1/me`                          | `{ password?, confirmEmail?, captchaToken }`. Có mật khẩu thì phải đúng (`invalid_credentials`); không có mật khẩu thì `confirmEmail` phải khớp email (`validation_failed`). Xóa tài khoản (cascade), xóa cookie refresh, 204      |

### Mã lỗi mới

| Mã                   | Status |
| -------------------- | ------ |
| `invalid_link`       | 400    |
| `same_password`      | 400    |
| `invalid_captcha`    | 400    |
| `email_not_verified` | 403    |

### Env mới

| Biến               | Ý nghĩa                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `SMTP_URL`         | `smtp://` / `smtps://`; mặc định Mailpit `smtp://localhost:1025` |
| `MAIL_FROM`        | Người gửi, vd `Novel Platform <no-reply@...>`                    |
| `APP_WEB_URL`      | Gốc link trong thư (mặc định `http://localhost:3000`)            |
| `TURNSTILE_SECRET` | Trống thì tắt captcha                                            |

Production bắt buộc đặt `SMTP_URL`, `APP_WEB_URL`.

### Bố cục

- `src/common/captcha/`, `src/infra/mail/`.
- **`modules/auth`:**
  - controller tách theo nhóm: `controllers/` (session, email, password);
  - service mới: email verification, password;
  - repository `email-tokens.repository.ts`;
  - `templates/`.
- `refresh-cookie.ts` chuyển sang `common/auth/`, vì `DELETE /v1/me` (module users) cũng xóa cookie.

## Kiểm tra

- **Unit:**
  - `CaptchaService` (fetch giả: đúng, sai, tắt);
  - template có link đúng;
  - luật mật khẩu mới;
  - token có `ev`;
  - `@RequireVerifiedEmail` guard.
- **e2e** (Mailpit thật bằng Testcontainers, worker chạy trong test, đọc thư qua API của Mailpit):
  - **Xác nhận email:**
    - Đăng ký → có thư → xác nhận → refresh → `/v1/me` có `emailVerified: true`.
    - Dùng lại link → `invalid_link`; link hết hạn → `invalid_link`.
  - **Gửi lại thư:** link cũ hết hiệu lực, link mới dùng được; đã xác nhận thì không gửi.
  - **Quên mật khẩu:** email lạ → 204, không có thư. Email có thật → thư → đặt lại → mật khẩu mới đăng nhập được, mật khẩu cũ không, refresh token cũ hết hiệu lực.
  - **Đổi mật khẩu:** sai mật khẩu cũ, trùng mật khẩu cũ, mật khẩu yếu → lỗi. Đổi đúng → phiên khác bị thu hồi, phiên hiện tại vẫn refresh được.
  - **Xóa tài khoản:** sai mật khẩu → lỗi. Đúng → đăng nhập lại không được, refresh token hết hiệu lực.
  - **Route test có `@RequireVerifiedEmail`:** chưa xác nhận → 403, đã xác nhận → 200.
- lint, typecheck, format, build, test unit, e2e; `db:generate` không ra file mới; `npm run dev` + `dev:worker` gửi thư thật vào Mailpit.

## Commit

"Email: xác nhận email, quên / đặt lại / đổi mật khẩu, captcha Turnstile, xóa tài khoản".
