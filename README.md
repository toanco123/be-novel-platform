# be-novel-platform

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
- Docker (OrbStack hoặc Docker Desktop): Postgres và Redis cho dev (docker-compose) và test e2e (Testcontainers)

## Bắt đầu

```bash
npm ci
cp .env.example .env
npm run db:up          # Postgres 17 (cổng 5433), Redis 7.4 (cổng 6380)
npm run db:migrate
npm run dev            # http://localhost:4000, tài liệu API và thử API ở /docs
npm run dev:worker     # process worker xử lý hàng đợi (terminal khác)
```

## Lệnh

| Lệnh                                  | Việc                                                           |
| ------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                         | Chạy dev, tự build lại khi sửa                                 |
| `npm run build` / `npm start`         | Build (SWC) ra `dist/` / chạy bản build                        |
| `npm run dev:worker` / `start:worker` | Worker xử lý hàng đợi (dev / bản build)                        |
| `npm run typecheck`                   | Kiểm tra kiểu (`tsc --noEmit`)                                 |
| `npm run lint`                        | oxlint                                                         |
| `npm run format` / `format:check`     | prettier                                                       |
| `npm test`                            | Test unit (`test/unit/**/*.spec.ts`)                           |
| `npm run test:e2e`                    | Test e2e (`test/**/*.e2e-spec.ts`, cần Docker)                 |
| `npm run openapi:export`              | Ghi `openapi.json` (để web, mobile sinh client có kiểu)        |
| `npm run keys:generate`               | In cặp khóa ES256 mới cho `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` |
| `npm run db:up` / `db:down`           | Bật / tắt Postgres và Redis (docker-compose)                   |
| `npm run db:generate`                 | Sinh migration từ schema Drizzle (`drizzle/migrations`)        |
| `npm run db:migrate`                  | Chạy migration                                                 |
| `npm run db:studio`                   | Drizzle Studio xem dữ liệu                                     |

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
  core/                   # dùng chung cho mọi module
    auth/                 #   access token, guard, decorator (@Public, @Roles, @CurrentUser)
    context/              #   request id, log, CLS
    errors/               #   mã lỗi, AppError, đổi lỗi về một dạng
    http/                 #   ValidationPipe, Swagger, decorator dùng chung
    rate-limit/           #   throttler toàn cục, RateLimitService
  infra/                  # hạ tầng
    database/             #   Postgres + Drizzle, schema/, migration, health
    redis/                #   client Redis dùng chung, health
    queue/                #   BullMQ: tên hàng đợi, processor
  modules/                # từng domain nghiệp vụ
    auth/                 #   đăng ký, đăng nhập, refresh token, đăng xuất
    users/                #   /v1/me, dữ liệu tài khoản
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
  auth.module.ts          # khai báo module
  auth.controller.ts      # HTTP + Swagger, không có luật nghiệp vụ
  auth.constants.ts       # hạn mức, tên cookie...
  auth.types.ts           # mọi type / interface của module
  auth-api.decorator.ts   # decorator Swagger dùng chung trong module
  sessions.repository.ts  # nơi duy nhất truy vấn bảng refresh_tokens
  refresh-cookie.ts       # đặt / xóa / đọc cookie refresh token
  refresh-token.ts        # sinh, băm, xét trạng thái refresh token
  request-client.ts       # web hay mobile, IP, user agent
  services/               # có 3 service nên gom vào thư mục
    auth.service.ts
    password.service.ts
    session.service.ts
  dto/                    # mỗi DTO một file
    register.dto.ts
    login.dto.ts
    refresh-token.dto.ts
    auth-session.dto.ts
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
| Không hậu tố (`refresh-cookie.ts`...)                       | Một nhóm hàm nhỏ cùng một việc, tên file là việc đó                            |

- Mỗi file một class (service, controller, guard, DTO...).
- Hàm thuần nhỏ chỉ phục vụ class / hàm chính trong file thì để cùng file (vd `throttleTracker` trong `app-throttler.guard.ts`).
- Hằng số chỉ dùng nội bộ trong một hàm (vd bảng tra mã Postgres) có thể để trong file đó; hằng số dùng chung hoặc là cấu hình thì đưa vào `*.constants.ts`.

### 2. Type và interface để file riêng

- Mọi `type` / `interface` của một thư mục nằm trong `<tên thư mục>.types.ts` (vd `modules/auth/auth.types.ts`, `core/errors/errors.types.ts`). File khác chỉ `import type`.
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

Ví dụ: `modules/auth/services/`, `core/auth/guards/`, `core/auth/decorators/`, `core/http/decorators/`. Còn một file thì để ngay trong thư mục. Ngoại lệ: `app.module.ts` và `worker.module.ts` ở `src/` là module gốc của hai process, để nguyên.

### 4. Import

- Alias `@/` → `src/`.
- Cùng thư mục, hoặc lên một cấp trong cùng nhánh: đường dẫn tương đối (`./auth.types`, `../errors/app-error`).
- Xa hơn (từ hai cấp `../` trở lên, hoặc sang nhánh khác như `modules` → `core`): dùng `@/` (vd `@/core/auth/auth.types`).
- Test luôn import bằng `@/`.

### 5. DTO và validate

- DTO là class, mỗi trường có decorator kiểm tra (`@IsEmail()`, `@Length(2, 50)`...) và `@ApiProperty({...})` cho Swagger. Trường bắt buộc khai báo `name!: string`.
- Chuẩn hóa trước khi kiểm tra: `@Trim()`, `@NormalizeEmail()` (`core/http/decorators/transform.decorator.ts`).
- `ValidationPipe` toàn cục: bỏ trường lạ, không tự đổi kiểu ngầm (`"5"` không thành số). Sai thì 400 `validation_failed` (xem [Định dạng lỗi](#định-dạng-lỗi)).
- DTO trả về (vd `MeDto`) cũng là class có `@ApiProperty`; giá trị có thể null khai báo `@ApiProperty({ type: String, nullable: true })`.

### 6. Module domain

- Controller → service → repository. Controller không truy vấn DB, service không đụng `req` / `res`.
- Chỉ repository import bảng Drizzle (`@/infra/database/schema`). Chỉ `infra/database` được import `postgres` / `drizzle-orm/postgres-js` (luật lint).
- Service ném `AppError('<mã>', details?)`; mã mới thêm vào `core/errors/error-codes.ts`. Trùng unique của bảng mới thì thêm tên constraint vào `core/errors/constraint-codes.ts`.
- Swagger: mỗi route có `@ApiOperation({ summary })` tiếng Việt, `@ApiErrorResponses(...codes)` cho các mã lỗi có thể trả, route cần đăng nhập có `@ApiBearerAuth()`.

### 7. Test

- **Unit:** `test/unit/`, cùng cấu trúc thư mục với `src/`. Vd `src/modules/auth/services/password.service.ts` → `test/unit/modules/auth/services/password.service.spec.ts`.
- **e2e:** `test/<tên module>/*.e2e-spec.ts`. Dựng app bằng `createTestApp()` và tạo người dùng bằng `registerUser(app)`. Mỗi test tự tạo dữ liệu riêng.
- Tên test tiếng Việt, mô tả hành vi.

### 8. Khác

- Prettier: không chấm phẩy, nháy đơn, `printWidth` 100.
- Tên nhánh git tiếng Anh (kebab-case); commit message, comment và tài liệu tiếng Việt.
- Mỗi commit tăng version: `npm version patch --no-git-tag-version`, đưa `package.json`, `package-lock.json` vào chính commit đó.
- Không log hay trả ra ngoài thông tin nhạy cảm (token, mật khẩu, cookie).

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

Chi tiết: [documents/plan-04-auth-co-ban.md](documents/plan-04-auth-co-ban.md).

## Định dạng lỗi

Mọi lỗi trả về:

```json
{
  "code": "validation_failed",
  "message": "Request validation failed",
  "details": {
    "issues": [{ "path": "password", "code": "isLength", "message": "..." }]
  },
  "requestId": "..."
}
```

- `code` ổn định, client dựa vào đó để hiển thị lời tiếng Việt. Danh sách mã ở `src/core/errors/error-codes.ts`.
- `message` tiếng Anh, chỉ để dev đọc.
- Lỗi validate: `details.issues[].code` là tên ràng buộc của class-validator (`isEmail`, `isLength`...), `path` là tên trường (trường lồng nhau nối bằng dấu chấm, vd `items.1.name`).
