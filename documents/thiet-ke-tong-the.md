# Kế hoạch: Dựng backend NestJS `be-novel-platform` (đợt 0: nền móng + Auth + module mẫu)

## Context

Web (`web-novel-platform`) và app (`mobile-novel-platform`) đang dùng Supabase làm toàn bộ backend: Postgres + RLS, khoảng 30 RPC, luật nghiệp vụ trong trigger, Supabase Auth, Storage, pg_cron, pg_net. Người dùng muốn có một backend riêng bằng NestJS để **không phụ thuộc Supabase nữa**.

Phạm vi đợt này:

- **Chỉ làm trong `be-novel-platform`** (thư mục đang trống). Web và mobile giữ nguyên, sẽ chuyển sang gọi BE ở các đợt sau.

Đã chốt với người dùng (13/10/2026):

- **DB riêng của BE:** Postgres độc lập, schema do BE quản lý bằng **Drizzle** (code-first, migration trong repo BE).
  - Bảng và cột thiết kế giống schema Supabase hiện tại (cùng UUID, cùng tên cột) để sau này chuyển dữ liệu bằng một script.
  - Không dùng RLS hay `auth.uid()`. Quyền, hạn mức và rate limit viết trong code NestJS.
- **Tự làm Auth:**
  - Email + mật khẩu (argon2id; nhận được hash bcrypt của user chuyển từ Supabase rồi băm lại).
  - JWT access ngắn hạn + refresh token xoay vòng.
  - Xác nhận email, quên mật khẩu, Google / Facebook / Apple.
- **Lưu ảnh:** S3-compatible, mặc định Cloudflare R2. Local dùng MinIO. Đợt này chỉ dựng hạ tầng.
- **Deploy:** Docker image + docker-compose cho local; nơi chạy chọn sau.
- **Đợt này gồm:** nền móng + Auth hoàn chỉnh + **module mẫu `genres`** (thể loại) làm đủ mọi lớp để các module sau làm theo. Xong thì `git init`, đẩy lên `https://github.com/toanco123/be-novel-platform.git` (nhánh `main`, người dùng đã yêu cầu).

Ngoài phạm vi đợt này:

- Các domain còn lại: truyện, chương, đọc, bình luận, Sáng tác, phần thưởng, thông báo, quản trị.
- Script chuyển dữ liệu từ Supabase.
- Sửa web hoặc mobile.
- Deploy production.

## 1. Công nghệ

Khi cài thì lấy bản mới nhất của đúng dòng phiên bản và ghim chính xác (`--save-exact`).

| Phần                   | Lựa chọn                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                | Node 24 (`.nvmrc`, `engines`), npm                                                                                                                                  |
| Framework              | NestJS **11** (Express 5), CLI dùng builder SWC, TypeScript 6 strict. NestJS 12 đã ra nhưng throttler-storage-redis chưa hỗ trợ, nên nâng cấp là việc riêng sau này |
| Config                 | `@nestjs/config` + schema env bằng **zod** (sai env thì dừng khi khởi động)                                                                                         |
| DTO, validate, OpenAPI | **class-validator + class-transformer** (đổi từ zod + nestjs-zod theo yêu cầu, 14/10/2026), `@ApiProperty` cho Swagger; zod chỉ dùng cho env                        |
| DB                     | `drizzle-orm` + `drizzle-kit` + `postgres` (postgres.js)                                                                                                            |
| Ngữ cảnh request       | `nestjs-cls` (requestId, actor)                                                                                                                                     |
| Log                    | `nestjs-pino` (requestId, userId; ẩn token, mật khẩu)                                                                                                               |
| Rate limit             | `@nestjs/throttler` lưu trên Redis (`@nest-lab/throttler-storage-redis`, `ioredis`), cộng `RateLimitService` riêng cho hạn mức nghiệp vụ                            |
| Job                    | `@nestjs/bullmq` + `bullmq` (hàng đợi `mail`; process `worker.ts` riêng)                                                                                            |
| Health, docs           | `@nestjs/terminus`, `@nestjs/swagger` (`/docs`, `/openapi.json`)                                                                                                    |
| Bảo mật                | `helmet`, CORS allowlist, `cookie-parser`, `jose` (JWT ES256, JWKS của Google/Apple), `argon2`, `bcryptjs` (chỉ để xác minh hash cũ)                                |
| Mail, lưu ảnh          | `nodemailer` (Mailpit ở local), `@aws-sdk/client-s3` + `s3-request-presigner`                                                                                       |
| Giám sát               | `@sentry/nestjs` (chỉ bật khi có DSN)                                                                                                                               |
| Test                   | **vitest** + `unplugin-swc`, `supertest`, **Testcontainers** (postgres:17, redis)                                                                                   |
| Lint, format           | `oxlint`, `prettier` (cùng quy ước với web: không chấm phẩy, nháy đơn, width 100)                                                                                   |

## 2. Cấu trúc thư mục

> Cập nhật 14/10/2026: cấu trúc thực tế và quy ước tổ chức file (mỗi file một việc, type ở `*.types.ts`, từ 2 file cùng loại thì gom thư mục con) xem mục **Cấu trúc thư mục** và **Quy ước code** trong [README.md](../README.md). Cây dưới đây là bản thiết kế ban đầu.

```
be-novel-platform/
├─ .github/workflows/ci.yml
├─ CLAUDE.md  README.md  .env.example  .nvmrc  Dockerfile  .dockerignore  docker-compose.yml
├─ nest-cli.json  .swcrc  tsconfig.json  tsconfig.build.json  vitest.config.ts  drizzle.config.ts
├─ .oxlintrc.json  .prettierrc.json  package.json
├─ drizzle/migrations/                 # SQL do drizzle-kit generate sinh ra, review trong PR
├─ docker/minio/init.sh                # tạo bucket covers, avatars
├─ documents/  kien-truc.md  quy-uoc-api.md  thiet-ke-database.md  lo-trinh.md   (tiếng Việt)
├─ scripts/  export-openapi.ts  seed-dev.ts
├─ src/
│  ├─ instrument.ts (Sentry)  main.ts  worker.ts  bootstrap.ts (cấu hình app dùng chung cho main và e2e)
│  ├─ app.module.ts  worker.module.ts
│  ├─ config/        env.schema.ts  app-config.ts
│  ├─ core/
│  │  ├─ context/    cls.ts (requestId, actor, ip)  client-ip.ts
│  │  ├─ auth/       actor.ts  jwt-auth.guard.ts  roles.guard.ts
│  │  │              decorators/{public,current-user,roles}.decorator.ts
│  │  ├─ errors/     error-codes.ts  app-error.ts  pg-error.ts  all-exceptions.filter.ts
│  │  ├─ http/       page.ts (PageQuery, Page<T>)  swagger.ts  api-error.dto.ts
│  │  ├─ rate-limit/ rate-limit.service.ts (cửa sổ trượt trên Redis)  app-throttler.guard.ts
│  │  └─ text/       slugify.ts (bỏ dấu, đ → d; giống web)
│  ├─ infra/
│  │  ├─ database/   database.module.ts  db.ts (client + Tx type)  db.health.ts
│  │  │              schema/{index,users,auth,profiles,genres}.ts
│  │  ├─ redis/  queue/ (tên hàng đợi, BullMQ root)  storage/ (S3, presign, publicUrl)  mail/ (mailer + template)
│  └─ modules/
│     ├─ health/
│     ├─ auth/       controllers, services (password, tokens, oauth, email-tokens), dto/, processors/mail
│     ├─ users/      me (hồ sơ, đổi tên, xóa tài khoản)
│     └─ genres/     genres.controller.ts  genres.service.ts  genres.repository.ts  genres.mapper.ts  dto/
└─ test/  setup/global-setup.ts (Testcontainers + migrate)  helpers/{app,users}.ts
          auth/*.e2e-spec.ts  genres/genres.e2e-spec.ts  errors/*.e2e-spec.ts
```

**Bố cục mỗi module** (mọi module sau làm theo):

- **Controller:** chỉ lo HTTP và Swagger.
- **Service:** luật nghiệp vụ, quyền, hạn mức, mở transaction.
- **Repository:** nơi duy nhất import bảng Drizzle; mọi hàm nhận `tx`.
- **Mapper:** dòng DB → DTO trả về (camelCase, giống kiểu domain của web).
- **`dto/`:** class DTO (class-validator).
- **Test:** unit đặt ở `test/unit/` (cùng cấu trúc thư mục với `src/`), e2e đặt ở `test/<module>/`.

## 3. Thiết kế lõi

### 3.1 Database (`infra/database`)

- Một pool postgres.js (`DATABASE_URL`, `max` theo env, `statement_timeout` đặt ở connection).
- Inject token `DB` (Drizzle). Kiểu `Tx` dùng chung cho db và transaction.
- Service mở `db.transaction(async (tx) => …)` khi ghi nhiều bảng.
- Lint (`no-restricted-imports`) cấm import `postgres` hoặc `drizzle-orm/postgres-js` ngoài `infra/database`.
- **Schema code-first** đặt trong `schema/*.ts`. `drizzle-kit generate` sinh SQL vào `drizzle/migrations`.
  - `npm run db:migrate` chạy migration như một bước riêng, không chạy khi app khởi động.
  - Hàm hoặc trigger thật sự cần thì viết bằng migration `--custom`. Đợt này chỉ có trigger `updated_at`.
- Tên bảng và cột bám theo schema Supabase (`documents/thiet-ke-database.md` của web) để script chuyển dữ liệu sau này chép thẳng được.

### 3.2 Lỗi

- `error-codes.ts` là bảng `code → { status, message }`. Dùng lại đúng các mã client đang hiểu:
  - `unauthenticated`, `invalid_token`, `forbidden`, `not_found`
  - `rate_limited`, `validation_failed`, `genre_exists`, `email_taken`, `invalid_credentials`, `email_not_verified`
  - `account_banned`, `invalid_captcha`, `token_expired`, `token_reused`, `internal_error`, `timeout`
- Service ném `AppError(code, details?)`.
- `pg-error.ts` đổi lỗi Postgres sang mã lỗi:

  | Mã Postgres | Kết quả                                                                                   |
  | ----------- | ----------------------------------------------------------------------------------------- |
  | `23505`     | đổi theo `constraint_name` (vd unique của genres → `genre_exists`), còn lại là `conflict` |
  | `23503`     | `not_found`                                                                               |
  | `23514`     | `validation_failed`                                                                       |
  | `57014`     | `timeout`                                                                                 |

- `AllExceptionsFilter` trả `{ code, message, details?, requestId }`.
  - `message` bằng tiếng Anh cho dev; **client tự hiển thị lời tiếng Việt theo `code`** (web đang làm vậy).
  - Lỗi validate nằm ở `details.issues`.
  - Chỉ gửi Sentry với lỗi 5xx.

### 3.3 Auth (`modules/auth`, `core/auth`)

- **Bảo vệ mặc định:** `JwtAuthGuard` áp toàn cục; `@Public()` để mở route; `@CurrentUser()` trả về `Actor`; `@Roles('admin')` qua `RolesGuard`.
- **Token:**
  - Access token: JWT **ES256**, 15 phút. Claims gồm `sub`, `role` (`user` | `admin`), `sid`. Khóa lấy từ env, có `kid` để xoay khóa.
  - Refresh token: chuỗi ngẫu nhiên 256 bit, **chỉ lưu SHA-256**, hạn 30 ngày, **xoay vòng mỗi lần dùng**, có `family_id`.
    - Dùng lại token đã xoay thì thu hồi cả họ token (`token_reused`).
    - Đăng xuất thu hồi một phiên; "đăng xuất mọi thiết bị" thu hồi tất cả.
  - Web nhận refresh token qua cookie `HttpOnly; Secure; SameSite=Lax` (path `/v1/auth`). Mobile nhận trong body (header `X-Client: mobile`). Endpoint refresh chấp nhận cả hai.
- **Mật khẩu:**
  - Băm bằng argon2id.
  - User chuyển sang từ Supabase có hash bcrypt (`$2a$`/`$2b$`): xác minh bằng bcryptjs, đăng nhập thành công thì băm lại bằng argon2id.
- **Captcha:** xác minh Turnstile ở server (`TURNSTILE_SECRET`; không có thì tắt, như web) cho các form đăng ký, đăng nhập, quên mật khẩu, gửi lại email.
- **Email** (gửi qua hàng đợi BullMQ `mail`, worker xử lý; local xem trong Mailpit):
  - Token xác nhận email và đặt lại mật khẩu lưu dạng hash, dùng một lần, có hạn: 24 giờ cho xác nhận, 1 giờ cho đặt lại.
  - Đặt lại mật khẩu xong thì thu hồi mọi refresh token.
  - Quên mật khẩu luôn trả 204, không lộ email có tồn tại hay không.
- **OAuth:**
  - Web: luồng redirect Authorization Code + PKCE + `state` cho Google và Facebook.
  - Mobile: đổi id token lấy phiên. Google và Apple xác minh JWT bằng JWKS qua `jose`; Facebook kiểm tra bằng Graph API `debug_token`.
  - Liên kết qua bảng `oauth_accounts (provider, provider_user_id)`; email trùng và đã xác minh thì gộp vào cùng user.
  - Thiếu cấu hình provider thì endpoint trả `provider_disabled`.
- **Chặn và rate limit:**
  - User bị khóa (`banned_until`) không đăng nhập hay refresh được.
  - Giới hạn đăng nhập sai và gửi email theo IP + email bằng `RateLimitService`.
- **Endpoint `/v1/auth`:**
  - `POST register`, `POST login`, `POST refresh`, `POST logout`, `POST logout-all`
  - `POST verify-email`, `POST resend-verification`, `POST forgot-password`, `POST reset-password`, `POST change-password`
  - `GET oauth/:provider` (chuyển hướng), `GET oauth/:provider/callback`, `POST oauth/:provider/token` (mobile)
- **Endpoint `/v1/me`:**
  - `GET` (hồ sơ: id, email, displayName, avatarUrl, role, emailVerified)
  - `PATCH` (displayName)
  - `DELETE` (cần mật khẩu, hoặc xác nhận lại với tài khoản OAuth; cascade)

### 3.4 Schema đợt này

Bám theo Supabase, đổi `auth.users` thành `users` của BE:

- **`users`:** `id` uuid, `email` (citext, unique), `password_hash` (null với tài khoản chỉ dùng OAuth), `email_verified_at`, `role` (`user` | `admin`), `banned_until`, `ban_reason`, `created_at`, `updated_at`, `last_sign_in_at`.
- **`profiles`:** `id` (FK → users, cascade), `display_name`, `avatar_url`, `created_at`, `updated_at`. Giữ tách riêng như Supabase để chuyển dữ liệu khớp.
- **`refresh_tokens`:** `id`, `user_id`, `family_id`, `token_hash` (unique), `expires_at`, `revoked_at`, `replaced_by`, `user_agent`, `ip`, `created_at`.
- **`oauth_accounts`:** `provider`, `provider_user_id` (khóa chính ghép), `user_id`, `email`, `created_at`.
- **`email_tokens`:** `id`, `user_id`, `purpose` (`verify` | `reset`), `token_hash`, `expires_at`, `used_at`.
- **`genres`:** cột giống Supabase (`slug` khóa chính, `name`, `description`, `created_by` FK → users, set null, `created_at`).

### 3.5 Module mẫu `genres`

Làm đủ mọi lớp và luật như web đang có:

- `GET /v1/genres`: công khai, sắp theo tên, `Cache-Control: public, max-age=60`.
- `GET /v1/genres/:slug`: không có thì 404.
- `POST /v1/genres`: cần đăng nhập.
  - Chuẩn hóa tên và tạo slug bằng `slugify` (giống `src/lib/slugify.ts` của web). Slug rỗng thì `validation_failed`.
  - Trùng slug thì **409 `genre_exists`**, `details.genre` là thể loại đang có.
  - Tối đa **10 thể loại / ngày / người** (`RateLimitService`), vượt thì 429 `rate_limited`. Quản trị viên không bị giới hạn.
- `storyCount` chưa có: thêm khi làm module truyện (đã ghi trong lộ trình).

### 3.6 Quy ước khác (ghi ở `documents/quy-uoc-api.md`)

- **Đường dẫn và phiên bản:** `/v1/...`, kebab-case, đi theo slug. Health check không có phiên bản: `/health/live`, `/health/ready` (DB + Redis).
- **Định dạng:** không bọc response; JSON camelCase; ngày giờ là chuỗi ISO UTC.
- **Phân trang:** `?page&pageSize` → `Page<T> = { items, total, page, pageCount }` (giống web).
- **HTTP:** `helmet`; CORS theo `CORS_ORIGINS`; `trust proxy` theo env; body tối đa 1 MB; tắt app gọn gàng khi có tín hiệu dừng.
- **Throttler toàn cục:** 300 request/phút (theo user, khách thì theo IP). Hạn mức nghiệp vụ nằm trong service.
- **OpenAPI:** `npm run openapi:export` ghi `openapi.json` (commit vào repo, CI kiểm tra khớp code) để web và mobile sinh client có kiểu.

## 4. Test

- **Unit:**
  - `slugify`, `pg-error`, env schema
  - `TokenService` (xoay vòng, phát hiện dùng lại)
  - `PasswordService` (argon2, xác minh bcrypt rồi băm lại)
  - Mapper, các luật của `GenresService` (repository giả)
- **e2e:** Testcontainers chạy postgres:17 + redis, migrate một lần trong global setup; mỗi test tự tạo dữ liệu riêng. Các ca:
  - **Auth:**
    - đăng ký → mail xác nhận (đọc token từ mailer giả) → xác nhận → đăng nhập → `/v1/me`
    - sai mật khẩu → `invalid_credentials`
    - refresh xoay vòng; dùng lại token cũ → `token_reused` và cả họ bị thu hồi
    - đăng xuất
    - quên / đặt lại mật khẩu thu hồi phiên cũ
    - tài khoản bị khóa không đăng nhập được
    - đăng nhập bằng hash bcrypt rồi DB đổi sang argon2
    - token sai hoặc hết hạn → 401 `invalid_token`
    - route admin với user thường → 403
  - **Genres:** khách xem được; tạo cần đăng nhập; trùng → 409 kèm thể loại đang có; thể loại thứ 11 trong ngày → 429; admin không bị giới hạn; slug rỗng → 400.
  - **Hạ tầng:** `/health/ready`, `/openapi.json`, định dạng lỗi có `requestId`.

## 5. Docker, CI, git

- **Dockerfile:** nhiều stage, `node:24-bookworm-slim`, chạy bằng user `node`, image dùng chung cho `api` (`dist/main.js`) và `worker` (`dist/worker.js`), có `HEALTHCHECK`.
- **docker-compose:** `db` (postgres:17), `redis`, `minio` + `minio-init`, `mailpit`; profile `app` thêm `api` (cổng 4000) và `worker`.
- **Script npm:**
  - chạy: `dev`, `dev:worker`, `build`, `start`, `start:worker`
  - kiểm tra: `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`
  - DB: `db:up`, `db:generate`, `db:migrate`, `db:studio`, `db:seed`
  - OpenAPI: `openapi:export`, `openapi:check`
- **CI (GitHub Actions):** lint, format, typecheck, build → unit → e2e (Testcontainers) → `openapi:check` → kiểm tra migration khớp schema (`drizzle-kit check` / generate không ra file mới) → `docker build`.
- **Tài liệu:** `CLAUDE.md` tiếng Việt, cùng cấu trúc với web. Ghi các quy tắc:
  - repository là nơi duy nhất đụng Drizzle
  - mã lỗi mới phải thêm vào registry
  - đổi schema thì `db:generate` và review SQL
  - commit message tiếng Việt, tên nhánh tiếng Anh, `npm version patch --no-git-tag-version` mỗi commit
  - tài liệu để trong `documents/`
- **Git:** `git init`, commit theo từng mốc (nền móng → auth → genres → docs/CI). Khi xong toàn bộ và kiểm tra pass:

  ```
  git remote add origin https://github.com/toanco123/be-novel-platform.git
  git branch -M main
  git push -u origin main
  ```

## 6. Các bước thực hiện

1. Khởi tạo dự án: Nest 11 + SWC, TypeScript strict, oxlint, prettier, vitest, `.env.example`, config zod, CLS, log, error filter, Swagger, helmet, CORS, throttler Redis, health. Commit.
2. Database: schema Drizzle, migration đầu, `db.ts`, compose (postgres, redis, minio, mailpit), Testcontainers global setup, test hạ tầng. Commit.
3. Auth: users, profiles, tokens, mật khẩu, mail và worker, xác nhận email, đặt lại mật khẩu, OAuth, `/v1/me`, guard và decorator, test unit và e2e. Commit.
4. Module mẫu `genres` + test. Commit.
5. Hạ tầng còn lại: storage S3 (presign + test với MinIO), Dockerfile, CI, README, CLAUDE.md, `documents/`. Commit.
6. Chạy toàn bộ kiểm tra (mục 7), rồi push lên GitHub.

## 7. Kiểm tra

1. `npm ci && npm run lint && npm run format:check && npm run typecheck && npm run build`
2. `npm run db:up && npm run db:migrate`: migration chạy sạch. `npm run db:generate` không sinh thêm file (schema khớp).
3. `npm test && npm run test:e2e`: tất cả xanh (cần Docker cho Testcontainers).
4. `npm run dev` + `npm run dev:worker`, kiểm tra tay:
   - `curl :4000/health/ready` → 200
   - đăng ký, mở Mailpit (`:8025`) lấy link xác nhận, đăng nhập, `GET /v1/me`
   - `POST /v1/genres` không có token → 401 `unauthenticated`
   - `/docs` hiển thị đủ endpoint
   - log có `requestId` và `userId`
5. `docker build .` và `docker compose --profile app up`: api và worker healthy.
6. Push xong: `git log origin/main` có đủ commit, GitHub Actions chạy xanh.

## 8. Lộ trình sau đợt này (ghi ở `documents/lo-trinh.md`)

| Đợt | Nội dung                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Đọc công khai: stories, chapters, search, ranking, related, curated, ghi lượt đọc (1 / người hoặc IP / chương / ngày); thêm `storyCount` cho genres |
| 2   | Hoạt động người đọc: tủ truyện, lịch sử đọc (gộp lịch sử khách), bình luận (trả lời, thích, sửa, báo cáo), chấm điểm, chặn, báo lỗi chương, liên hệ |
| 3   | Sáng tác + lưu ảnh: truyện, chương, duyệt truyện, hẹn giờ, thống kê, hạn mức tác giả; upload presign lên R2, hạn mức ảnh, bìa nhỏ                   |
| 4   | Phần thưởng, thông báo, job: điểm danh, sổ phiếu, đề cử; push token; Expo push qua BullMQ; job xuất bản chương hẹn giờ                              |
| 5   | Quản trị: tổng quan, người dùng và khóa, gỡ truyện, duyệt, chọn truyện, hộp thư, báo lỗi, bình luận, thể loại, nhập hàng loạt                       |
| 6   | Chuyển dữ liệu từ Supabase: script ETL (giữ UUID, hash bcrypt, ảnh từ Storage sang R2), chạy thử trên bản sao                                       |
| 7   | Chuyển web và mobile sang gọi BE theo từng feature (đổi `api.remote.ts` / `api.ts`), rồi tắt Supabase                                               |

## 9. Rủi ro

| Rủi ro                                                    | Cách xử lý                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Luật nghiệp vụ trong trigger Supabase bị sót khi viết lại | Mỗi module đối chiếu mục 4 `thiet-ke-database.md` của web, mỗi luật có một ca test                                       |
| Schema lệch Supabase làm khó chuyển dữ liệu               | Giữ tên bảng, cột và UUID; ghi các chỗ đổi trong `documents/thiet-ke-database.md` của BE                                 |
| Bảo mật auth (token, reset, OAuth)                        | Dùng thư viện chuẩn (`jose`, `argon2`), token lưu dạng hash, test riêng cho xoay vòng, dùng lại, hết hạn, khóa tài khoản |
| NestJS 11 là bản `legacy`                                 | Ghim phiên bản; nâng lên 12 thành việc riêng khi các thư viện hỗ trợ                                                     |
| e2e cần Docker                                            | Ghi rõ trong README; CI dùng Testcontainers trên `ubuntu-latest`                                                         |
