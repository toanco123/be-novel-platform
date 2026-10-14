# Phần 6: Đăng nhập Google, Facebook, Apple

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- Callback không có `state` hợp lệ (hết 10 phút, giả mạo) thì chuyển về trang báo lỗi của web `APP_WEB_URL/auth/callback?error=oauth_failed`, không trả JSON (người dùng đang ở trình duyệt).
- Provider chưa xác minh email mà email đã có tài khoản → `?error=email_taken` (không gộp).
- Ảnh của provider chỉ nhận URL `https`. Ảnh mặc định của Facebook (`is_silhouette`) không lấy.
- Facebook gửi kèm `appsecret_proof` khi đọc hồ sơ.
- Chưa làm đăng nhập Google bằng id token trên app: app hiện đăng nhập Google qua trình duyệt. Thêm khi app chuyển sang Google Sign-In gốc.

## Mục tiêu

Thay phần đăng nhập mạng xã hội của Supabase, giữ đúng cách web và app đang dùng:

| Nơi | Google, Facebook                                                          | Apple                                                                          |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Web | Chuyển trang sang Google / Facebook rồi quay về web                       | Không có                                                                       |
| App | Mở trình duyệt trong app (`openAuthSessionAsync`), quay về bằng deep link | Bảng đăng nhập của hệ thống trả id token kèm nonce (giống `signInWithIdToken`) |

## Thiết kế

### Luồng chuyển trang (Google, Facebook; web và app)

Giống luồng PKCE của Supabase: client giữ `codeVerifier` bí mật, gửi `codeChallenge` khi bắt đầu.

1. Client mở `GET /v1/auth/oauth/:provider/authorize?redirect_to=…&code_challenge=…`.
   - `redirect_to`: trang web hoặc deep link của app, phải nằm trong danh sách cho phép (chống open redirect).
   - `code_challenge`: SHA-256 (base64url) của `codeVerifier` của client.
2. BE lưu `state` vào Redis (10 phút, dùng một lần) rồi chuyển sang trang đăng nhập của provider.
   - Google dùng thêm PKCE riêng giữa BE và Google.
3. Provider quay về `GET /v1/auth/oauth/:provider/callback?code&state`.
   - BE đổi `code` lấy thông tin người dùng, tìm hoặc tạo tài khoản (mục dưới).
   - Tạo mã một lần (Redis, 60 giây), rồi chuyển về `redirect_to?code=…`.
   - Lỗi (người dùng bấm hủy, tài khoản bị khóa, không có email...) thì chuyển về `redirect_to?error=<mã lỗi>`.
4. Client gọi `POST /v1/auth/oauth/exchange { code, codeVerifier }` → nhận phiên đăng nhập như `login`.
   - Web nhận cookie refresh token; app gửi `X-Client: mobile` để nhận trong body.
   - Mã đã dùng, hết hạn, hoặc `codeVerifier` không khớp → 400 `oauth_failed`. Ai chặn được deep link cũng không dùng được mã.

### Apple (app)

`POST /v1/auth/oauth/apple/token { idToken, nonce, displayName? }`:

- Xác minh id token bằng khóa công khai của Apple (JWKS, `jose`): `iss` = `https://appleid.apple.com`, `aud` thuộc `APPLE_CLIENT_IDS` (bundle id của app), còn hạn.
- Claim `nonce` phải bằng SHA-256 (hex) của `nonce` gốc app gửi lên (token không dùng lại được).
- `displayName`: Apple chỉ gửi họ tên ở lần cho phép đầu tiên. App gửi kèm thì dùng cho tài khoản mới tạo (giống `saveAppleName` của app).

### Tìm hoặc tạo tài khoản

Bảng mới `oauth_accounts`:

| Cột                             | Ghi chú                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `provider`                      | enum `google` \| `facebook` \| `apple`                   |
| `provider_user_id`              | `sub` / id của provider; khóa chính ghép cùng `provider` |
| `user_id`                       | FK → `users`, cascade                                    |
| `email`                         | Email provider báo lúc liên kết                          |
| `created_at`, `last_sign_in_at` |                                                          |

Bảng này thay `auth.identities` của Supabase. Index `(user_id)`.

1. **Đã liên kết** `(provider, provider_user_id)` → đăng nhập vào tài khoản đó.
2. **Chưa liên kết, provider báo email đã xác minh, có tài khoản cùng email** → liên kết vào tài khoản đó (Supabase cũng tự gộp như vậy).
   - Nếu tài khoản đó **chưa xác nhận email**, thì người đăng ký trước chưa chứng minh có hộp thư (có thể là kẻ đăng ký trước bằng email của người khác). Khi đó:
     - xóa mật khẩu;
     - thu hồi mọi phiên;
     - đánh dấu email đã xác nhận.
   - Người thật có email vẫn vào được bằng provider, hoặc đặt lại mật khẩu.
3. **Không có tài khoản** → tạo tài khoản không mật khẩu kèm hồ sơ.
   - Email đã xác minh thì đánh dấu luôn.
   - Tên lấy giống trigger `handle_new_user` của Supabase: tên từ provider → phần trước @ của email → "Bạn đọc", tối đa 30 ký tự.
   - `avatar_url` lấy ảnh của provider (tối đa 2048 ký tự).
4. **Provider không có email** (Facebook đăng ký bằng số điện thoại) → `oauth_email_required`.
5. **Tài khoản bị khóa** → `account_banned`. Ghi `last_sign_in_at`.

### Cấu hình (env)

| Biến                                       | Ý nghĩa                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `API_PUBLIC_URL`                           | Gốc URL công khai của API, để dựng `redirect_uri` khai báo ở Google / Facebook (`…/v1/auth/oauth/:provider/callback`) |
| `OAUTH_REDIRECT_URLS`                      | Các tiền tố `redirect_to` được phép (csv). Luôn gồm `APP_WEB_URL`; thêm deep link của app, vd `webtruyen://`          |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Thiếu thì tắt Google                                                                                                  |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`   | Thiếu thì tắt Facebook                                                                                                |
| `APPLE_CLIENT_IDS`                         | Bundle id (csv). Thiếu thì tắt Apple                                                                                  |

- Provider chưa cấu hình thì 400 `provider_disabled`.
- `GET /v1/auth/oauth/providers` trả các provider đang bật, để client chỉ hiện nút tương ứng.

### Mã lỗi mới

| Mã                     | Status | Khi nào                                                                  |
| ---------------------- | ------ | ------------------------------------------------------------------------ |
| `provider_disabled`    | 400    | Provider chưa cấu hình                                                   |
| `oauth_failed`         | 400    | Đổi mã thất bại, token sai, người dùng hủy, `redirect_to` không cho phép |
| `oauth_email_required` | 400    | Provider không cho biết email                                            |

### Bố cục

- `modules/auth/oauth/`: controller, service, repository `oauth-accounts`, `providers/` (`GoogleOAuthClient`, `FacebookOAuthClient`, `AppleOAuthClient`), PKCE và state.
- Mỗi client cung cấp cách dựng URL đăng nhập và cách đổi `code` (hoặc xác minh id token) lấy hồ sơ chung `{ provider, providerUserId, email, emailVerified, name, avatarUrl }`.
- Test thay các client này bằng bản giả: `createTestApp` nhận `overrides`, dựng bằng `Test.createTestingModule`.

## Kiểm tra

- **Unit:**
  - PKCE (challenge từ verifier).
  - Danh sách `redirect_to` cho phép (không bị lừa bằng `https://web.com.evil.com`).
  - Tên hiển thị lấy như `handle_new_user`.
  - Xác minh id token Apple bằng JWKS tạo trong test: đúng; sai `aud`, `iss`, nonce; hết hạn.
- **e2e** (provider giả):
  - Luồng chuyển trang đủ bước:
    - `authorize` → 302 sang provider, `state` có trong URL;
    - `callback` → 302 về `redirect_to?code`;
    - `exchange` → phiên đăng nhập.
  - Tài khoản:
    - Tài khoản mới có tên, ảnh, email đã xác nhận.
    - Lần sau cùng người → cùng tài khoản.
    - Liên kết tài khoản email cùng địa chỉ. Tài khoản chưa xác nhận thì mật khẩu cũ hết dùng được, phiên cũ bị thu hồi.
  - Mã một lần:
    - dùng lại → `oauth_failed`;
    - `codeVerifier` sai → `oauth_failed`.
  - Callback lỗi:
    - `state` sai, người dùng hủy → về `redirect_to?error=oauth_failed`;
    - bị khóa → `?error=account_banned`;
    - không có email → `?error=oauth_email_required`.
  - Chặn đầu vào: `redirect_to` lạ → 400; provider chưa cấu hình → `provider_disabled`.
  - Apple token: tài khoản mới dùng `displayName`; nonce sai → `oauth_failed`.
- lint, typecheck, format, build, test; migration khớp schema; `openapi.json` export lại.

## Commit

"OAuth: Google, Facebook (chuyển trang + PKCE), Apple (id token), liên kết tài khoản".
