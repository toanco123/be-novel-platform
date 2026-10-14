# Phần 4: Auth cơ bản

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- **`sid` là id của phiên** (`family_id`), không phải id của refresh token (id này đổi mỗi lần xoay vòng).
- **Route của auth bỏ qua header `Authorization`:** `register`, `login`, `refresh`, `logout` dùng `@Public({ ignoreToken: true })`. Client lỡ gửi kèm access token đã hết hạn vẫn refresh hay đăng xuất được, thay vì bị `invalid_token`.
- **Refresh trả cả `user`** (giống đăng nhập): web tải lại trang chỉ cần một request.
- **Mã lỗi khi refresh:**
  - Không gửi token: `unauthenticated`.
  - Token đã thu hồi do đăng xuất hay bị khóa (không có token thay): `invalid_token`, không phải `token_reused`.
  - Tài khoản bị khóa: kiểm tra **trước** khi xoay vòng, trong cùng transaction. Thu hồi cả phiên và trả `account_banned`; `details.bannedUntil` cho client hiển thị.
  - Web: lỗi `invalid_token`, `account_banned` thì xóa cookie. `token_reused` không xóa, vì tab khác có thể vừa nhận cookie mới.
- **Mật khẩu khi đăng nhập** chỉ cần 1–128 ký tự: user chuyển từ Supabase có thể có mật khẩu ngắn hơn 8. Đăng ký vẫn 8–72.
- **Thứ tự guard toàn cục:** đăng ký ở `AppModule` theo thứ tự `JwtAuthGuard` → `RolesGuard` → `AppThrottlerGuard`, để throttler đếm theo user. `RateLimitModule` không còn tự đăng ký guard.
- **`createZodDto` bọc lại** ở `core/http/zod-dto.ts`:
  - zod 4.6 sinh `type: ['string', 'null']` cho giá trị nullable, Nest hiểu nhầm thành mảng (`avatarUrl` thành `string[]` trong Swagger). Lớp bọc đổi về `type: 'string', nullable: true`.
  - Luật lint chặn import `createZodDto` thẳng từ `nestjs-zod`.
- **Log có `userId`** (`customProps` của pino-http).
- **Test:** project unit có `DATABASE_URL` / `REDIS_URL` giả (module config kiểm tra env ngay khi nạp). e2e bật `TRUST_PROXY_HOPS=1` để giả nhiều IP bằng `X-Forwarded-For`.
- **Cần nhớ khi chuyển web sang BE:** cookie `SameSite=Lax` chỉ được gửi khi web và API cùng "site" (vd `novel.vn` và `api.novel.vn`). Khác site thì phải đổi sang `SameSite=None` (kèm chống CSRF).

## Mục tiêu

Người dùng đăng ký và đăng nhập bằng email + mật khẩu, nhận **access token** (JWT ngắn hạn) và **refresh token** (xoay vòng). Mọi route mặc định cần đăng nhập, trừ route đánh dấu `@Public()`. Có `/v1/me` để xem và sửa hồ sơ.

Phần này **chưa có**: xác nhận email, quên mật khẩu, captcha (phần 5); Google / Facebook / Apple (phần 6); xóa tài khoản (phần 5, cần xác nhận lại). Đăng ký xong vẫn đăng nhập được ngay; `emailVerified` là `false` cho tới phần 5.

## Thiết kế

### Bảng (Drizzle, migration mới)

Bám theo Supabase để chuyển dữ liệu sau này: `users` thay `auth.users`, `profiles` giữ như cũ.

| Bảng             | Cột chính                                                                                                                                                                                                      | Ghi chú                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `users`          | `id` uuid, `email` citext unique, `password_hash` (null với tài khoản chỉ OAuth), `email_verified_at`, `role` (`user` \| `admin`), `banned_until`, `ban_reason`, `last_sign_in_at`, `created_at`, `updated_at` | Trigger `set_updated_at`                     |
| `profiles`       | `id` (khóa chính, FK → `users`, cascade), `display_name` (2–50), `avatar_url`, `created_at`, `updated_at`                                                                                                      | Tạo cùng lúc với user, trong một transaction |
| `refresh_tokens` | `id`, `user_id` (FK, cascade), `family_id`, `token_hash` (unique), `expires_at`, `revoked_at`, `replaced_by_id`, `user_agent`, `ip`, `created_at`, `last_used_at`                                              | Index `(user_id)`, `(family_id)`             |

### Mật khẩu (`PasswordService`)

- Băm bằng **argon2id** (`argon2`, tham số mặc định của thư viện, đủ an toàn).
- Hash bcrypt (`$2a$` / `$2b$`) của user chuyển sang từ Supabase: xác minh bằng `bcryptjs`. Nếu đúng thì `needsRehash = true`, và service đăng nhập băm lại bằng argon2id.
- Luật mật khẩu giống form của web: 8–72 ký tự (72 là giới hạn bcrypt, giữ nguyên để user cũ không bị lệch).

### Access token (`TokenService`)

- JWT **ES256** (`jose`), hạn 15 phút. Claims: `sub` (user id), `role`, `sid` (id của refresh token đang dùng, để đăng xuất phiên đó), `iss`, `aud`.
- Khóa lấy từ env:
  - `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` (PEM, PKCS8 / SPKI) và `JWT_KEY_ID`.
  - Không đặt thì dev và test tự sinh cặp khóa tạm (có cảnh báo). Production bắt buộc phải có.
  - Script `npm run keys:generate` in ra một cặp khóa mới.
- Header có `kid` để sau này xoay khóa.

### Refresh token

- Chuỗi ngẫu nhiên 32 byte (base64url). DB **chỉ lưu SHA-256**. Hạn 30 ngày (`REFRESH_TOKEN_TTL_DAYS`).
- **Xoay vòng:** mỗi lần refresh tạo token mới cùng `family_id`; token cũ được đánh dấu `revoked_at`, `replaced_by_id`. Hạn của token mới không vượt quá hạn của cả họ (30 ngày tính từ lúc đăng nhập).
- **Phát hiện dùng lại:** token đã thu hồi mà vẫn được gửi lên thì thu hồi **cả họ** và trả `token_reused`. Có một khoảng ân hạn 10 giây cho trường hợp hai tab cùng refresh: nếu token vừa bị thay trong 10 giây đó thì trả `token_reused` nhưng **không** thu hồi cả họ.
- **Trả cho client:**
  - **Web:** cookie `refresh_token`, `HttpOnly; Secure; SameSite=Lax; Path=/v1/auth`. Riêng ở dev, `Secure` tắt khi chạy http.
  - **Mobile:** gửi header `X-Client: mobile` thì token nằm trong body.
  - `/refresh` và `/logout` nhận token từ cookie hoặc body.

### Đăng nhập, khóa, rate limit

- Sai email hoặc mật khẩu thì luôn trả `invalid_credentials`, không lộ email có tồn tại hay không.
  - Khi email không tồn tại vẫn chạy so khớp với một hash giả, để thời gian phản hồi như nhau.
- **Tài khoản bị khóa** (`banned_until` > hiện tại): đăng nhập và refresh đều trả `account_banned` (403).
- **Rate limit** (`RateLimitService`):
  - Đăng nhập sai: 5 lần / 15 phút theo email, 20 lần / 15 phút theo IP. Đăng nhập đúng thì xóa đếm theo email.
  - Đăng ký: 5 lần / giờ theo IP.
- Đăng nhập đúng thì ghi `last_sign_in_at`.

### Guard và decorator (`core/auth`)

- **`JwtAuthGuard` toàn cục:**
  - Đọc `Authorization: Bearer`.
  - Token sai hoặc hết hạn thì 401 `invalid_token`, **kể cả ở route public**, để client biết phải refresh thay vì lặng lẽ thành khách.
  - Không có token ở route cần đăng nhập thì 401 `unauthenticated`.
- **Gắn người gọi:** `req.user` và CLS `actor` = `{ id, role, sessionId }`. Throttler dùng `req.user.id` (phần 3 đã chuẩn bị).
- **Decorator:** `@Public()`, `@CurrentUser()`, `@Roles('admin')` (+ `RolesGuard`, sai vai trò thì 403 `forbidden`).
- **Kiểm tra khóa tài khoản:** guard **không** truy vấn DB mỗi request (token chỉ sống 15 phút). Khi khóa tài khoản (phần quản trị), toàn bộ refresh token bị thu hồi, nên người bị khóa mất quyền chậm nhất sau 15 phút.

### API (`/v1/auth`, `/v1/me`)

| Endpoint                          | Việc                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/auth/register` (public) | `{ email, password, displayName }` → 201 `{ user, accessToken, expiresIn }` + refresh token. Email trùng → 409 `email_taken` |
| `POST /v1/auth/login` (public)    | `{ email, password }` → 200 như trên                                                                                         |
| `POST /v1/auth/refresh` (public)  | Token mới (xoay vòng)                                                                                                        |
| `POST /v1/auth/logout` (public)   | Thu hồi phiên của refresh token gửi lên, xóa cookie; 204. Token không hợp lệ cũng trả 204                                    |
| `POST /v1/auth/logout-all`        | Thu hồi mọi phiên của người dùng; 204                                                                                        |
| `GET /v1/me`                      | `{ id, email, displayName, avatarUrl, role, emailVerified, createdAt }`                                                      |
| `PATCH /v1/me`                    | `{ displayName }` (2–50 ký tự, bỏ khoảng trắng ở hai đầu)                                                                    |

### Mã lỗi mới

- `invalid_credentials` (401)
- `invalid_token` (401)
- `token_reused` (401)
- `account_banned` (403)
- `email_taken` (409, map từ constraint `users_email_unique`)

### Swagger (người dùng yêu cầu thêm, 14/10/2026)

- Trang `/docs` dễ xem và thử API:
  - Mỗi endpoint có tóm tắt tiếng Việt; schema request và response (từ DTO zod) kèm ví dụ.
  - Liệt kê các mã lỗi có thể trả về (`@ApiErrorResponses(...)`, dùng chung dạng lỗi `ApiErrorDto`).
- Nút **Authorize** (bearer JWT) để dán access token; `persistAuthorization` giữ token khi tải lại trang.
- Nhóm theo tag (`auth`, `me`, `health`); bật "Try it out" sẵn.
- Swagger UI gửi cookie cùng origin nên thử `/v1/auth/refresh` bằng cookie được ngay trên trang.
- Đã làm thêm:
  - Gọi `register`, `login`, `refresh` thành công thì access token **tự điền** vào nút Authorize và được lưu lại.
  - Mỗi mã lỗi có một ví dụ riêng.
  - Body của `refresh`, `logout` có sẵn hai ví dụ: web (`{}`, dùng cookie) và mobile (gửi `refreshToken`).
  - Đã kiểm tra trên trình duyệt: đăng ký → tải lại trang → `/v1/me` → refresh bằng cookie → đăng xuất mọi thiết bị.

## Công việc

1. Thư viện: `jose`, `argon2`, `bcryptjs`, `cookie-parser` (+ types).
2. Env:
   - `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID`
   - `JWT_ISSUER` (mặc định `novel-api`), `JWT_AUDIENCE` (mặc định `novel-clients`)
   - `ACCESS_TOKEN_TTL_SECONDS` (900), `REFRESH_TOKEN_TTL_DAYS` (30)
   - `COOKIE_SECURE` (mặc định `true` ở production)
3. Schema `users`, `profiles`, `refresh_tokens`; migration (`db:generate` + trigger `updated_at`).
4. `PasswordService`, `TokenService`, `SessionService` (tạo, xoay vòng, thu hồi refresh token); `AuthService` (đăng ký, đăng nhập); `UsersRepository`, `SessionsRepository`.
5. Guard, decorator, CLS actor; `cookie-parser` trong bootstrap.
6. Controller `auth` và `me`; DTO zod; Swagger có bearer auth.
7. Script `keys:generate`.

## Kiểm tra

- **Unit:**
  - `PasswordService`: argon2 đúng / sai; hash bcrypt cũ đúng thì `needsRehash`.
  - `TokenService`: ký rồi xác minh; token hết hạn, sai chữ ký, sai `aud`.
  - Phát hiện dùng lại refresh token, cả trường hợp ân hạn (repository giả).
  - Env: production mà thiếu khóa JWT thì dừng.
- **e2e** (Postgres và Redis thật):
  - Đăng ký → `/v1/me` → sửa tên.
  - Email trùng (kể cả khác hoa thường) → `email_taken`.
  - Mật khẩu ngắn → `validation_failed`.
  - Đăng nhập sai → `invalid_credentials`; lần sai thứ 6 → `rate_limited`.
  - Refresh xoay vòng: token cũ không dùng lại được, dùng lại sau ân hạn thì cả họ bị thu hồi.
  - Web: cookie `HttpOnly`, refresh bằng cookie. Mobile: token trong body.
  - Đăng xuất làm refresh token đó vô hiệu; đăng xuất mọi thiết bị vô hiệu tất cả.
  - Tài khoản bị khóa → `account_banned` khi đăng nhập và refresh.
  - User có hash bcrypt đăng nhập được, DB đổi sang argon2.
  - Không có token → 401 `unauthenticated`; token rác hoặc hết hạn → 401 `invalid_token` (kể cả route public).
  - Route `@Roles('admin')` với user thường → 403.
  - Response và log không bao giờ chứa `password_hash` hay refresh token.

## Commit

"Auth cơ bản: đăng ký, đăng nhập, JWT, refresh token xoay vòng, /v1/me".
