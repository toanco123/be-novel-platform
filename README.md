# be-novel-platform

[![CI](https://github.com/toanco123/be-novel-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/toanco123/be-novel-platform/actions/workflows/ci.yml)

Backend NestJS cho nền tảng đọc truyện chữ (web `web-novel-platform`, app `mobile-novel-platform`). Mục tiêu: thay Supabase bằng backend riêng (Postgres + Drizzle, auth riêng, lưu ảnh S3/R2), làm dần từng phần.

- Thiết kế tổng thể: [documents/thiet-ke-tong-the.md](documents/thiet-ke-tong-the.md)
- Lộ trình và tiến độ từng phần: [documents/lo-trinh.md](documents/lo-trinh.md)
- Mỗi phần có plan riêng trong `documents/plan-<số>-<tên>.md`, viết trước khi làm.

## Công nghệ

| Phần            | Dùng                                                                            |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | NestJS 11 (Express 5), build bằng SWC, TypeScript 6 strict, Node 24             |
| DTO, validate   | class-validator + class-transformer, `@ApiProperty` cho Swagger                 |
| Biến môi trường | `@nestjs/config` + schema zod (sai thì dừng khi khởi động)                      |
| Database        | Postgres 17, Drizzle ORM (code-first) + postgres.js, migration bằng drizzle-kit |
| Redis, hàng đợi | ioredis, `@nestjs/throttler` lưu trên Redis, BullMQ (process worker riêng)      |
| Auth            | JWT ES256 (`jose`), argon2id (+ bcrypt cho hash cũ của Supabase)                |
| Log, ngữ cảnh   | nestjs-pino, nestjs-cls                                                         |
| Tài liệu API    | Swagger (`/docs`, `/openapi.json`)                                              |
| Test            | vitest + unplugin-swc, supertest, Testcontainers (Postgres, Redis thật)         |
| Lint, format    | oxlint, prettier                                                                |

## Yêu cầu

- Node 24 (`.nvmrc`), npm
- Docker (OrbStack hoặc Docker Desktop): Postgres, Redis, Mailpit, RustFS (S3) cho dev (docker-compose) và test e2e (Testcontainers)

## Bắt đầu

```bash
npm ci
cp .env.example .env
npm run db:up          # Postgres 17 (cổng 5433), Redis 7.4 (cổng 6380), Mailpit (thư ở http://localhost:8025), RustFS (S3, cổng 9010)
npm run db:migrate
npm run storage:init   # tạo bucket lưu ảnh trên RustFS (chạy một lần)
npm run dev            # http://localhost:4000, tài liệu API và thử API ở /docs
npm run dev:worker     # process worker xử lý hàng đợi, gửi email (terminal khác)
```

## Lệnh

| Lệnh                                      | Việc                                                           |
| ----------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                             | Chạy dev, tự build lại khi sửa                                 |
| `npm run build` / `npm start`             | Build (SWC) ra `dist/` / chạy bản build                        |
| `npm run dev:worker` / `start:worker`     | Worker xử lý hàng đợi (dev / bản build)                        |
| `npm run typecheck`                       | Kiểm tra kiểu (`tsc --noEmit`)                                 |
| `npm run lint`                            | oxlint                                                         |
| `npm run format` / `format:check`         | prettier                                                       |
| `npm test`                                | Test unit (`test/unit/**/*.spec.ts`)                           |
| `npm run test:e2e`                        | Test e2e (`test/**/*.e2e-spec.ts`, cần Docker)                 |
| `npm run openapi:export`                  | Ghi `openapi.json` (để web, mobile sinh client có kiểu)        |
| `npm run keys:generate`                   | In cặp khóa ES256 mới cho `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` |
| `npm run storage:init`                    | Tạo bucket lưu ảnh (dev), cho đọc công khai                    |
| `docker compose --profile app up --build` | Chạy cả app trong Docker: migration → API (cổng 4000) + worker |
| `npm run db:up` / `db:down`               | Bật / tắt Postgres và Redis (docker-compose)                   |
| `npm run db:generate`                     | Sinh migration từ schema Drizzle (`drizzle/migrations`)        |
| `npm run db:migrate`                      | Chạy migration                                                 |
| `npm run db:studio`                       | Drizzle Studio xem dữ liệu                                     |

## Cấu trúc thư mục

```
src/
  main.ts                 # chạy API
  worker.ts               # chạy worker (hàng đợi, không mở cổng HTTP)
  bootstrap.ts            # dựng app; dùng chung cho main, test e2e, script
  app.module.ts           # module gốc của API
  worker.module.ts        # module gốc của worker
  app.constants.ts
  config/                 # biến môi trường: schema (zod), kiểm tra, AppConfig
  common/                 # mọi thứ dùng chung cho nhiều module
    auth/                 #   access token, cookie refresh, guards/, decorators/ (@Public, @Roles, @CurrentUser, @RequireVerifiedEmail)
    captcha/              #   Cloudflare Turnstile (@RequireCaptcha, CaptchaDto)
    context/              #   request id, cấu hình log, CLS
    crypto/               #   băm mật khẩu, token ngẫu nhiên + SHA-256, khóa JWT
    errors/               #   bố cục lỗi chung: mã lỗi, AppException, filter, ErrorLogger
    http/                 #   thông tin client gọi API (web / mobile, IP, user agent)
    pagination/           #   phân trang: PageQueryDto, Page<T>
    rate-limit/           #   throttler toàn cục, RateLimitService
    swagger/              #   dựng /docs, @ApiErrorResponses
    response/             #   đầu ra: lọc theo DTO và bọc { statusCode, data, meta } (@ResponseDto, @ApiField)
    validation/           #   kiểm tra đầu vào: ValidationPipe, @Trim, @NormalizeEmail
    utils/                #   hàm tiện ích thuần (withTimeout)
  infra/                  # hạ tầng
    database/             #   Postgres + Drizzle, schema/, migration, health
    redis/                #   client Redis dùng chung, health
    queue/                #   BullMQ: tên hàng đợi, processor
    mail/                 #   hàng đợi mail (API), gửi SMTP bằng nodemailer (worker)
    storage/              #   lưu ảnh S3 (presigned upload, URL công khai, xóa)
  modules/                # từng domain nghiệp vụ
    auth/                 #   đăng ký, đăng nhập, refresh token, đăng xuất
    users/                #   /v1/me, dữ liệu tài khoản
    genres/               #   thể loại (module mẫu cho các module sau)
    health/               #   /health/live, /health/ready
  cli/                    # script chạy bằng node (migrate, xuất OpenAPI, sinh khóa)
test/
  unit/                   # test unit, cùng cấu trúc thư mục với src/
  <tên module>/           # test e2e (Postgres, Redis thật qua Testcontainers)
  helpers/, setup/        # dựng app, tạo người dùng; global setup của e2e
drizzle/migrations/       # SQL migration (sinh bởi drizzle-kit, review trước khi commit)
documents/                # thiết kế, lộ trình, plan từng phần (tiếng Việt)
```

Ví dụ một module (`src/modules/auth`):

```
auth/
  auth.module.ts               # khai báo module
  auth.constants.ts            # hạn mức, hạn link email...
  auth.types.ts                # mọi type / interface của module
  auth-api.decorator.ts        # decorator Swagger dùng chung trong module
  refresh-token-state.ts       # xét trạng thái refresh token (còn dùng được, bị dùng lại...)
  controllers/                 # 3 controller: chỉ HTTP + Swagger
    auth.controller.ts         #   đăng ký, đăng nhập, refresh, đăng xuất
    email-verification.controller.ts
    account-password.controller.ts
  services/                    # luật nghiệp vụ
    auth.service.ts
    session.service.ts
    email-token.service.ts
    email-verification.service.ts
    account-password.service.ts
  repositories/                # nơi duy nhất truy vấn bảng của module
    sessions.repository.ts
    email-tokens.repository.ts
  templates/                   # nội dung email
    mail-layout.template.ts
    verify-email.template.ts
    reset-password.template.ts
  dto/                         # mỗi DTO một file
    register.dto.ts
    login.dto.ts
    ...
```

## Quy ước code

### 1. Mỗi file chỉ làm một việc

Không viết lẫn nhiều việc trong một file. Tên file nói rõ file đó chứa gì:

| Hậu tố                                                      | Chứa                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `*.module.ts`                                               | Chỉ khai báo module Nest (imports, providers, exports)                         |
| `*.controller.ts`                                           | Route HTTP + Swagger; gọi service, không chứa luật nghiệp vụ                   |
| `*.service.ts`                                              | Luật nghiệp vụ, quyền, hạn mức, mở transaction                                 |
| `*.repository.ts`                                           | Nơi duy nhất truy vấn DB cho bảng của nó; mọi hàm nhận `Executor` (db hoặc tx) |
| `*.mapper.ts`                                               | Dòng DB → DTO trả về                                                           |
| `*.rules.ts`                                                | Luật thuần (không DB), vd tài khoản có đang bị khóa                            |
| `*.dto.ts`                                                  | **Một** class DTO (class-validator + `@ApiProperty`)                           |
| `*.types.ts`                                                | **Mọi** `type` / `interface` của thư mục                                       |
| `*.constants.ts`                                            | Hằng số, token inject, hạn mức, tên cookie, timeout                            |
| `*.decorator.ts`                                            | Decorator                                                                      |
| `*.guard.ts`, `*.pipe.ts`, `*.filter.ts`, `*.middleware.ts` | Một guard / pipe / filter / middleware                                         |
| `*.health.ts`, `*.lifecycle.ts`, `*.processor.ts`           | Health indicator, đóng kết nối khi tắt app, xử lý job                          |
| `*.options.ts`, `*.script.ts`                               | Cấu hình truyền cho thư viện (vd log), script (vd Lua của Redis)               |
| `*.client.ts`                                               | Gọi API bên ngoài (vd Google, Facebook, Apple)                                 |
| Không hậu tố (`refresh-cookie.ts`...)                       | Một nhóm hàm nhỏ cùng một việc, tên file là việc đó                            |

- Mỗi file một class (service, controller, guard, DTO...).
- Hàm thuần nhỏ chỉ phục vụ class / hàm chính trong file thì để cùng file (vd `throttleTracker` trong `app-throttler.guard.ts`).
- Hằng số chỉ dùng nội bộ trong một hàm (vd bảng tra mã Postgres) có thể để trong file đó; hằng số dùng chung hoặc là cấu hình thì đưa vào `*.constants.ts`.

### 2. Type và interface để file riêng

- Mọi `type` / `interface` của một thư mục nằm trong `<tên thư mục>.types.ts` (vd `modules/auth/auth.types.ts`, `common/errors/errors.types.ts`). File khác chỉ `import type`.
- Không khai báo type trong service, controller, repository... Kể cả kiểu tham số nhiều trường: đặt tên rồi đưa vào `*.types.ts` (vd `NewUserWithProfile`).
- Kiểu dòng DB của Drizzle nằm ở `infra/database/schema/schema.types.ts` (`UserRow`, `RefreshTokenRow`...).

### 3. Nhiều file cùng loại thì gom thư mục

Trong một thư mục, **loại file nào có từ 2 file trở lên** thì gom vào thư mục con tên số nhiều:

| Loại       | Thư mục con      |
| ---------- | ---------------- |
| service    | `services/`      |
| repository | `repositories/`  |
| types      | `types/`         |
| guard      | `guards/`        |
| decorator  | `decorators/`    |
| DTO        | `dto/` (luôn có) |

Ví dụ: `modules/auth/services/`, `common/auth/guards/`, `common/auth/decorators/`. Còn một file thì để ngay trong thư mục. Ngoại lệ: `app.module.ts` và `worker.module.ts` ở `src/` là module gốc của hai process, để nguyên.

### 4. Dùng chung thì đưa vào `common/`

- Thứ gì **nhiều module dùng được** (hoặc sẽ dùng) thì đặt trong `src/common/<mảng>/`, không để trong module nghiệp vụ. Vd băm mật khẩu và token ngẫu nhiên ở `common/crypto/` (auth dùng, phần xác nhận email sau này cũng dùng), thông tin client ở `common/http/`.
- Chia theo mảng: `auth`, `context`, `crypto`, `errors`, `http`, `rate-limit`, `swagger`, `validation`, `utils` (sau này thêm `pagination`...).
- Chỉ dùng trong một module thì để trong module đó (vd cookie refresh token ở `modules/auth/`).
- Provider dùng chung (vd `PasswordService`, `ErrorLogger`) khai báo trong module `@Global()` của mảng đó (`CryptoModule`, `ErrorsModule`), module nghiệp vụ chỉ việc inject.
- Hạ tầng (Postgres, Redis, hàng đợi) ở `src/infra/`, cấu hình ở `src/config/`.

### 5. Import

- Alias `@/` → `src/`.
- Cùng thư mục, hoặc lên một cấp trong cùng nhánh: đường dẫn tương đối (`./auth.types`, `../errors/app.exception`).
- Xa hơn (từ hai cấp `../` trở lên, hoặc sang nhánh khác như `modules` → `common`): dùng `@/` (vd `@/common/auth/auth.types`).
- Test luôn import bằng `@/`.
- Thứ tự import: thư viện Node (`node:`), package, `@/`, `../`, `./`; trong mỗi nhóm theo bảng chữ cái.

### 6. DTO: đầu vào, đầu ra

**Tên trường:** body / query nhận cả camelCase lẫn snake_case (`displayName` hay `display_name`; gửi cả hai thì lấy camelCase). Server đổi về camelCase trước khi validate (`common/utils/case-keys.ts`), nên DTO và code luôn viết camelCase. Response luôn camelCase.

**DTO đầu vào** (body, query): class theo kiểu chuẩn của Nest, mỗi trường có decorator kiểm tra (`@IsEmail()`, `@Length(2, 30)`...) và `@ApiProperty({...})` cho Swagger.

- Khai báo `email: string`, **không** dùng `!`. Trường tùy chọn `refreshToken?: string` kèm `@IsOptional()` và `@ApiPropertyOptional()`. (`tsconfig` tắt `strictPropertyInitialization` để viết được như vậy.)
- Chuẩn hóa trước khi kiểm tra: `@Trim()`, `@NormalizeEmail()` (`common/validation/transform.decorator.ts`).
- `ValidationPipe` toàn cục: bỏ trường lạ (không báo lỗi), không tự đổi kiểu ngầm (`"5"` không thành số). Sai thì 400 `validation_failed` (xem [Body lỗi trả cho client](#body-lỗi-trả-cho-client)).

```ts
export class LoginDto {
  @ApiProperty({ format: 'email', example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string

  @ApiProperty({ minLength: 1, maxLength: 128 })
  @IsString()
  @Length(1, 128)
  password: string
}
```

**Danh sách có phân trang:** query kế thừa `PageQueryDto` (`page` từ 1, `pageSize` 1–100, mặc định 20); repository nhận `pageWindow(query)` (`offset`, `limit`); service trả `Page<T>` (`{ items, total, page, pageSize }`); route gắn `@ResponsePage(Dto)`. Ví dụ: `GET /v1/genres` (`src/modules/genres`).

**DTO đầu ra** (response): mỗi trường dùng `@ApiField({...})` (`@ApiFieldOptional` cho trường tùy chọn) thay cho `@ApiProperty`. Route trả dữ liệu **bắt buộc** gắn `@ResponseDto(Dto)` thay cho `@ApiOkResponse`:

- Response bọc `{ statusCode, data, meta }` (xem [Dạng response](#dạng-response)); `data` **chỉ có các trường có `@ApiField`**: service lỡ trả thừa (vd `passwordHash`) cũng không lộ ra ngoài. Object con và mảng cũng được lọc: `@ApiField({ type: MeDto })`, `@ApiField({ type: [ItemDto] })`.
- Swagger ghi luôn schema response; status khác 200 thì truyền thêm, vd `@ResponseDto(AuthSessionDto, { status: 201 })`.
- Giá trị có thể null: `@ApiField({ type: String, nullable: true })`.

```ts
export class MeDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ type: String, nullable: true })
  avatarUrl: string | null
}

@Get()
@ResponseDto(MeDto)
me(@CurrentUser() actor: Actor) {
  return this.users.getMe(actor.id)
}
```

### 7. Module domain

- Controller → service → repository. Controller không truy vấn DB, service không đụng `req` / `res`.
- Chỉ repository import bảng Drizzle (`@/infra/database/schema`). Chỉ `infra/database` được import `postgres` / `drizzle-orm/postgres-js` (luật lint).
- Service ném `AppException('<mã>', details?)` (xem [Lỗi](#lỗi)).
- Swagger: mỗi route có `@ApiOperation({ summary })` tiếng Việt, `@ApiErrorResponses(...codes)` cho các mã lỗi có thể trả, route cần đăng nhập có `@ApiBearerAuth()`.

### 8. Test

- **Unit:** `test/unit/`, cùng cấu trúc thư mục với `src/`. Vd `src/common/crypto/password.service.ts` → `test/unit/common/crypto/password.service.spec.ts`.
- **e2e:** `test/<tên module>/*.e2e-spec.ts`. Dựng app bằng `createTestApp()` và tạo người dùng bằng `registerUser(app)`. Mỗi test tự tạo dữ liệu riêng.
- Tên test tiếng Việt, mô tả hành vi.

### 9. Khác

- Prettier: không chấm phẩy, nháy đơn, `printWidth` 100.
- Tên nhánh git tiếng Anh (kebab-case); commit message, comment và tài liệu tiếng Việt.
- Mỗi commit tăng version: `npm version patch --no-git-tag-version`, đưa `package.json`, `package-lock.json` vào chính commit đó.
- Không log hay trả ra ngoài thông tin nhạy cảm (token, mật khẩu, cookie).

## CI

GitHub Actions (`.github/workflows/ci.yml`) chạy mỗi lần push lên `main` và mỗi pull request, ba job song song:

- **Kiểm tra:**
  - lint, format, typecheck, build, test unit;
  - schema Drizzle đổi mà chưa có migration thì lỗi (chạy `npm run db:generate` rồi commit).
- **Test e2e:**
  - Postgres, Redis, Mailpit thật qua Testcontainers;
  - có cả test so `openapi.json` với API hiện tại: đổi API thì chạy `npm run openapi:export` rồi commit file.
- **Docker:** build image rồi chạy thử ở chế độ production (khóa JWT sinh bằng image, env production giả), chờ `/health/live` trả 200.

Trước khi push nên chạy ở máy: `npm run lint && npm run typecheck && npm run test:all`.

## Thử API trên Swagger (`/docs`)

1. Mở `POST /v1/auth/register` (hoặc `login`), sửa email trong body, bấm **Execute**.
2. Access token tự điền vào nút **Authorize** (vẫn còn khi tải lại trang). Các route có ổ khóa gọi được ngay, vd `GET /v1/me`.
3. Access token hết hạn sau 15 phút: gọi `POST /v1/auth/refresh` với body `{}`. Trình duyệt đã có cookie refresh token nên không cần dán gì.

Ở dev không đặt `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` thì app tự sinh khóa tạm, nên token cũ hết hiệu lực mỗi lần chạy lại. Production bắt buộc đặt khóa (`npm run keys:generate`).

## Auth

- **Access token:** JWT ES256, 15 phút, gửi qua header `Authorization: Bearer <token>`. Mọi route mặc định cần đăng nhập, trừ route `@Public()`.
- **Refresh token:** 30 ngày, xoay vòng mỗi lần dùng; dùng lại token cũ thì cả phiên bị thu hồi.
  - Web nhận trong cookie HttpOnly `refresh_token` (path `/v1/auth`).
  - Mobile gửi header `X-Client: mobile` để nhận trong body, rồi gửi lại trong body của `/v1/auth/refresh`.

- **Email chưa xác nhận** vẫn đăng nhập được; route thao tác viết gắn `@RequireVerifiedEmail()` (403 `email_not_verified`). Xác nhận xong, client gọi refresh để access token mới có trạng thái đã xác nhận (claim `ev`).
- **Mật khẩu mới** (đăng ký, đặt lại, đổi): 8–72 ký tự, có chữ và số (`@IsNewPassword()`, lỗi `hasLetter` / `hasDigit`).
- **Captcha Turnstile** cho đăng ký, đăng nhập, quên mật khẩu, đổi mật khẩu, xóa tài khoản: body gửi `captchaToken`. Không đặt `TURNSTILE_SECRET` thì tắt.

| Endpoint                                                             | Việc                                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /v1/auth/register`, `login`, `refresh`, `logout`, `logout-all` | Phiên đăng nhập                                                                                |
| `POST /v1/auth/verify-email`                                         | `{ token }` từ link trong thư                                                                  |
| `POST /v1/auth/resend-verification`                                  | Gửi lại thư xác nhận (cần đăng nhập)                                                           |
| `POST /v1/auth/forgot-password`                                      | `{ email }` → luôn 204, có tài khoản thì gửi link đặt lại (1 giờ)                              |
| `POST /v1/auth/reset-password`                                       | `{ token, password }` → đăng xuất mọi thiết bị                                                 |
| `POST /v1/auth/change-password`                                      | `{ currentPassword, newPassword }` → đăng xuất các thiết bị khác                               |
| `GET` / `PATCH` / `DELETE /v1/me`                                    | Hồ sơ, sửa tên, xóa tài khoản (`password` hoặc `confirmEmail` với tài khoản không có mật khẩu) |
| `GET /v1/auth/oauth/providers`                                       | Provider mạng xã hội đang bật                                                                  |
| `GET /v1/auth/oauth/:provider/authorize`                             | Google / Facebook: chuyển trang đăng nhập (web và app), `?redirect_to=&code_challenge=`        |
| `POST /v1/auth/oauth/exchange`                                       | `{ code, codeVerifier }` sau khi quay về `redirect_to?code=`                                   |
| `POST /v1/auth/oauth/apple/token`                                    | Apple (app): `{ idToken, nonce, displayName? }`                                                |

Chi tiết: [plan-04-auth-co-ban.md](documents/plan-04-auth-co-ban.md), [plan-05-email.md](documents/plan-05-email.md).

## Thể loại (module mẫu)

`src/modules/genres` làm đủ mọi lớp; module mới làm theo khuôn này. Bảng `genres` lấy đúng từ Supabase.

| Endpoint               | Việc                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/genres`       | Danh sách (công khai, phân trang): thể loại có sẵn trước, rồi thể loại người dùng tạo theo thời gian tạo                      |
| `GET /v1/genres/:slug` | Một thể loại                                                                                                                  |
| `POST /v1/genres`      | Tạo (đã xác nhận email): trùng tên → 409 `genre_exists` kèm thể loại đang có; tối đa 10 / ngày (quản trị viên không giới hạn) |

## Đăng nhập mạng xã hội

- **Google, Facebook** (web và app): luồng chuyển trang có PKCE như Supabase.
  1. Client tạo `codeVerifier` bí mật, mở `/v1/auth/oauth/:provider/authorize?redirect_to=…&code_challenge=…`.
  2. Đăng nhập xong, provider quay về BE. BE chuyển về `redirect_to?code=…` (mã dùng một lần, 60 giây) hoặc `?error=<mã lỗi>`.
  3. Client gọi `POST /v1/auth/oauth/exchange { code, codeVerifier }` để nhận phiên.
  - `redirect_to` phải là `APP_WEB_URL` hoặc tiền tố trong `OAUTH_REDIRECT_URLS` (vd deep link `webtruyen://`).
- **Apple** (app iOS): gửi id token và nonce tới `/v1/auth/oauth/apple/token`.
- **Tài khoản:**
  - Cùng người ở provider → cùng tài khoản.
  - Email provider đã xác minh trùng tài khoản email → liên kết. Tài khoản đó chưa xác nhận email thì bỏ mật khẩu cũ, thu hồi phiên cũ.
  - Chưa có → tạo tài khoản không mật khẩu (tên, ảnh lấy giống trigger của Supabase).
- **Cấu hình:**
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`, `APPLE_CLIENT_IDS`. Thiếu thì provider đó tắt (`provider_disabled`).
  - Ở Google / Facebook khai báo redirect URI `<API_PUBLIC_URL>/v1/auth/oauth/<provider>/callback`.

## Lưu ảnh (S3)

- **Nơi lưu:** S3-compatible.
  - Production: Cloudflare R2.
  - Dev và test: RustFS (MinIO đã ngừng phát hành image bản cộng đồng), cổng 9010 trên máy.
- **`StorageService`** (`src/infra/storage`):
  - `presignUpload({ key, contentType, size })` trả link PUT 5 phút, ký kèm `Content-Type` và `Content-Length`. Client phải gửi đúng loại và kích thước đã khai, sai thì S3 trả 403.
  - Các hàm khác: `publicUrl(key)`, `head(key)`, `delete(key)`, `deletePrefix(prefix)`.
- **Một bucket** (`S3_BUCKET`), thư mục theo loại: `avatars/<userId>/…`, `covers/<ownerId>/…` (giống đường dẫn của Supabase Storage).
- **Ảnh công khai:** `<S3_PUBLIC_URL>/<key>`.
- **Đợt này mới có hạ tầng;** upload ảnh đại diện, bìa truyện làm ở đợt Sáng tác.

## Docker

- **`Dockerfile`:** một image (`node:24-bookworm-slim`, user `node`, `NODE_ENV=production`) cho ba lệnh:
  - API (mặc định): `node dist/main.js`, có `HEALTHCHECK` `/health/live`;
  - worker: `node dist/worker.js`;
  - migration: `node dist/cli/migrate.js` (chạy trước khi bật bản mới).
- **Production cần đặt:**
  - khóa JWT (`npm run keys:generate`);
  - `DATABASE_URL`, `REDIS_URL`, `SMTP_URL`, `APP_WEB_URL`, `API_PUBLIC_URL`;
  - `S3_*` (không được là localhost; sai thì app dừng ngay khi khởi động).
- **`docker compose --profile app up --build`:** chạy cả app trên máy (dùng `.env`, đổi host sang tên service). Riêng link upload S3 trong chế độ này trỏ tới `rustfs:9000`, trình duyệt ngoài Docker không mở được; muốn thử upload thì chạy `npm run dev`.

## Email

- API dựng thư rồi đẩy vào hàng đợi `mail`; process worker (`npm run dev:worker`) gửi qua SMTP (`SMTP_URL`), lỗi thì thử lại 3 lần. Không chạy worker thì thư nằm chờ trong hàng đợi.
- Dev: Mailpit bắt mọi thư, xem ở http://localhost:8025. Production: SMTP của nhà cung cấp (Resend, SES, Brevo...).
- Link trong thư về trang của web: `APP_WEB_URL/auth/verify-email?token=…`, `APP_WEB_URL/auth/reset-password?token=…`. Token lưu dạng SHA-256 (bảng `email_tokens`), dùng một lần.
- Nội dung thư (tiếng Việt, HTML + chữ thuần) ở `src/modules/auth/templates/`.

## Dạng response

Response thành công có dạng chung **`{ statusCode, data, meta }`** (chốt 14/10/2026); `statusCode` luôn trùng HTTP status:

```json
{
  "statusCode": 200,
  "data": { "id": "...", "displayName": "Linh", "avatarUrl": null },
  "meta": { "requestId": "0b8e7f7e-2d51-4d1a-a1f3-5f0f6a8c9d22" }
}
```

| Trường hợp                   | Trả về                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Thành công, có dữ liệu       | `{ statusCode, data: <DTO>, meta: { requestId } }`, status 200 / 201 (route gắn `@ResponseDto(Dto)`)                                            |
| Danh sách                    | `{ statusCode, data: [...], meta: { total, page, pageSize, pageCount, requestId } }` (route gắn `@ResponsePage(Dto)`, query `?page=&pageSize=`) |
| Thành công, không có dữ liệu | 204, body trống (vd đăng xuất)                                                                                                                  |
| Lỗi                          | `{ statusCode, error: { code, message, details? }, meta: { requestId } }`, status 4xx / 5xx (xem [Lỗi](#lỗi))                                   |
| `/health/*`                  | Dạng của terminus (`{ status, info, ... }`), không bọc, cho Docker / load balancer đọc                                                          |

- Bọc và lọc làm tự động ở `ResponseInterceptor` (`common/response/`) cho route có `@ResponseDto`; controller, service chỉ trả DTO.
- Thành công hay lỗi đều có `statusCode` (trùng HTTP status) và `meta.requestId` (trùng header `x-request-id`); thành công có `data`, lỗi có `error`.
- Test e2e quét `openapi.json`: route `/v1` nào trả 200 / 201 mà không có dạng `{ statusCode, data, meta }` (quên `@ResponseDto`) thì test lỗi.

## Lỗi

Mọi thứ về lỗi nằm ở `src/common/errors/`, dùng chung cho API và worker:

| File                                                 | Việc                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `error-code.ts`                                      | Bảng mã lỗi `ERROR_CODES` (`code → { status, message }`); mã mới thêm ở đây    |
| `app.exception.ts`                                   | `AppException(code, details?)`: lỗi nghiệp vụ service ném ra                   |
| `constraint-codes.ts`                                | Tên constraint unique → mã lỗi riêng (vd `users_email_unique` → `email_taken`) |
| `pg-error.ts`                                        | Lỗi Postgres → mã lỗi (`23505` trùng, `23503` khóa ngoại, `57014` quá giờ...)  |
| `validation-exception.factory.ts`                    | Lỗi class-validator → `validation_failed` kèm `details.issues`                 |
| `to-api-error.ts`                                    | Mọi loại lỗi → một dạng chung `{ status, code, message, details? }`            |
| `to-error-response.ts`                               | Dạng chung → body trả cho client (thêm `statusCode`, `requestId`)              |
| `all-exceptions.filter.ts`                           | Filter toàn cục: trả body lỗi, lỗi 5xx thì ghi log                             |
| `error-logger.service.ts`                            | `ErrorLogger`: ghi log lỗi theo cấu trúc chung                                 |
| `dto/error-response.dto.ts`, `dto/error-body.dto.ts` | `ErrorResponseDto`, `ErrorBodyDto` cho Swagger                                 |
| `errors.types.ts`, `errors.module.ts`                | Kiểu của lỗi; module `@Global()` cung cấp `ErrorLogger`                        |

### Body lỗi trả cho client

Cùng khuôn với response thành công: `statusCode`, `meta`; thay `data` bằng `error`.

```json
{
  "statusCode": 400,
  "error": {
    "code": "validation_failed",
    "message": "Request validation failed",
    "details": {
      "issues": [{ "path": "password", "code": "isLength", "message": "..." }]
    }
  },
  "meta": { "requestId": "..." }
}
```

- `statusCode` trùng HTTP status.
- `error.code` ổn định, client dựa vào đó để hiển thị lời tiếng Việt. Danh sách mã ở `src/common/errors/error-code.ts`.
- `error.message` tiếng Anh, chỉ để dev đọc. Lỗi 5xx không lộ chi tiết (luôn là `Internal server error`).
- Lỗi validate: `error.details.issues[].code` là tên ràng buộc của class-validator (`isEmail`, `isLength`...), `path` là tên trường (trường lồng nhau nối bằng dấu chấm, vd `items.1.name`).

### Ghi log lỗi

Chỗ nào cần ghi log lỗi (filter, worker xử lý job, service bắt lỗi rồi xử lý tiếp) đều dùng `ErrorLogger`, để mọi dòng log lỗi cùng một cấu trúc:

```ts
constructor(private readonly errors: ErrorLogger) {}

try {
  await this.mailer.send(...)
} catch (error) {
  this.errors.log(error, { queue: 'mail', jobId: job.id }) // context tùy ý
}
```

Mỗi dòng log có:

```json
{
  "error": { "code": "internal_error", "status": 500, "message": "Internal server error" },
  "err": { "type": "Error", "message": "thông điệp gốc", "stack": "..." },
  "requestId": "...",
  "userId": "...",
  "queue": "mail",
  "jobId": "42"
}
```

- Lỗi 5xx ghi mức `error`, lỗi khác mức `warn`.
- `err` (thông điệp gốc, stack) chỉ có với lỗi ngoài dự kiến; `AppException` 4xx là lỗi đã biết nên không kèm stack.
- `requestId`, `userId` tự gắn khi đang trong một request; worker không có thì truyền thêm context (vd `queue`, `jobId`).
