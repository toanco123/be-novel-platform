# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

Backend **NestJS 11** cho nền tảng đọc truyện chữ, thay dần Supabase của web (`../web-novel-platform`) và app (`../mobile-novel-platform`). Đợt này **chỉ làm trong repo này**; web và mobile giữ nguyên, sẽ chuyển sang gọi BE ở các đợt sau. Người dùng giao tiếp bằng tiếng Việt; tài liệu viết bằng tiếng Việt.

- Thiết kế tổng thể: [documents/thiet-ke-tong-the.md](documents/thiet-ke-tong-the.md) — đọc trước khi làm phần mới.
- Lộ trình và tiến độ: [documents/lo-trinh.md](documents/lo-trinh.md).
- **Cách làm:** từng phần nhỏ. Trước mỗi phần viết plan `documents/plan-<số>-<tên>.md` (mục tiêu, công việc, kiểm tra), làm xong thì đánh dấu ✅ ở plan và ở lộ trình.
- Nghiệp vụ gốc (luật, giới hạn, mã lỗi) lấy từ `../web-novel-platform/documents/thiet-ke-database.md` (mục 3 bảng, 4 luật và mã lỗi, 5 quyền). BE viết lại các luật đó trong code (không RLS, không `auth.uid()`), giữ tên bảng, cột và UUID để sau này chuyển dữ liệu từ Supabase.

## Lệnh

```bash
npm run dev              # dev, cổng 4000, /docs là Swagger
npm run build            # nest build (SWC) → dist/
npm run typecheck        # tsc --noEmit
npm run lint             # oxlint
npm run format           # prettier --write .
npm test                 # unit (src/**/*.spec.ts)
npm run test:e2e         # e2e (test/**/*.e2e-spec.ts)
npx vitest run src/core/errors/to-api-error.spec.ts   # một file
npm run openapi:export   # ghi openapi.json
npm run db:up            # Postgres 17 (cổng 5433) + Redis 7.4 (cổng 6380) bằng docker-compose; db:down để tắt
npm run dev:worker       # process worker (hàng đợi BullMQ)
npm run db:generate      # sinh migration từ schema Drizzle
npm run db:migrate       # chạy migration (build rồi node dist/cli/migrate.js)
```

## Kiến trúc

- **Khởi động:** `src/bootstrap.ts` (`createApp`, `configureApp`) gom mọi cấu hình app: requestId, body limit 1 MB, helmet, CORS, versioning `/v1`, Swagger. `main.ts`, test e2e và `cli/export-openapi.ts` đều đi qua đây để test chạy đúng như production.
- **Cấu hình:** `config/env.schema.ts` (zod), sai env thì dừng khi khởi động. Đọc qua `AppConfig.get('KEY')`, không đọc `process.env` trực tiếp. Thêm biến thì sửa cả schema, `.env.example` và test của schema. Khi `NODE_ENV=test` không đọc file `.env` (biến test đặt trong `vitest.config.ts`).
- **Ngữ cảnh request:** `core/context`: `requestIdMiddleware` đặt `req.id` (nhận `x-request-id` hợp lệ của client hoặc tự sinh) và trả lại header; `nestjs-cls` giữ id cho filter và service; `nestjs-pino` ghi log JSON có `requestId`, ẩn `authorization`, cookie, mật khẩu, token.
- **Lỗi:**
  - Service ném `AppError(code, details?)`.
  - `AllExceptionsFilter` (toàn cục) đổi mọi lỗi qua `toApiError` thành `{ code, message, details?, requestId }`. Gồm: lỗi zod → `validation_failed` với `details.issues`, `HttpException` theo status, lỗi body-parser, lỗi lạ → 500 không lộ chi tiết.
  - `message` tiếng Anh cho dev; client hiển thị tiếng Việt theo `code`.
  - **Mã mới thêm vào `core/errors/error-codes.ts`.**
- **Validate và OpenAPI:** DTO là `class X extends createZodDto(schema)` (nestjs-zod), `ZodValidationPipe` toàn cục; Swagger ở `/docs`, `/openapi.json` (`SWAGGER_ENABLED`).
- **Database** (`src/infra/database`, plan `documents/plan-02-database.md`):
  - Một pool postgres.js; inject `@Inject(DB) db: Db` (Drizzle, `casing: 'snake_case'`). Kiểu `Tx` cho transaction, `Executor` (= `Db | Tx`) cho repository.
  - Chỉ `src/infra/database` (và test) được import `postgres` / `drizzle-orm/postgres-js` (luật `no-restricted-imports` của oxlint).
  - **Schema code-first:** `schema/*.ts` export ở `schema/index.ts`, dùng `timestamps` cho bảng có sửa.
  - **Migration:** `npm run db:generate` rồi review SQL trong `drizzle/migrations` (hàm, trigger thì `drizzle-kit generate --custom`). Bảng có `updated_at` thêm trigger `set_updated_at()` trong migration. `db:migrate` là bước riêng khi deploy, app không tự migrate. Sửa schema mà quên generate thì `drizzle-kit generate` sẽ ra file mới (CI kiểm tra).
  - Lỗi Postgres đi qua `pg-error.ts`: `23505` → `conflict` (hoặc mã riêng theo tên constraint trong `CONSTRAINT_CODES`), `23503` → `not_found`, `23514`/`22001` → `validation_failed`, `57014` → `timeout`.
  - `/health/ready` kiểm tra DB (503 `service_unavailable` khi hỏng).
- **Redis, rate limit, hàng đợi** (plan `documents/plan-03-redis-rate-limit-queue.md`):
  - `infra/redis`: client `@Inject(REDIS) redis: Redis` (ioredis) dùng chung cho rate limit và health check.
  - **Throttler toàn cục** (`AppThrottlerGuard`, lưu trên Redis): chặn spam thô, `THROTTLE_LIMIT` request mỗi `THROTTLE_TTL_SECONDS` giây. Đếm theo `req.user.id`, khách thì theo IP; bỏ qua `/health`. Route cần giới hạn riêng dùng `@Throttle({ default: { limit, ttl } })` hoặc `@SkipThrottle()`.
  - **Hạn mức nghiệp vụ** dùng `RateLimitService.consume(key, { limit, windowSeconds })`: cửa sổ trượt bằng script Lua; hết lượt thì ném `AppError('rate_limited', { retryAfterSeconds })`. Có thêm `peek` (xem, không tính) và `reset`. Key đặt theo `<domain>:<hành động>:<id>`.
  - **Hàng đợi** BullMQ (`infra/queue`): tên hàng đợi và job ở `queues.ts`; module đẩy job thì `BullModule.registerQueue` + `@InjectQueue`. Processor (`@Processor`, `extends WorkerHost`) **chỉ khai báo trong `WorkerModule`**, để API không tự xử lý job. Mặc định thử lại 3 lần, backoff mũ.
  - Worker: `src/worker.ts` (`createWorker()`, `createApplicationContext`, không có HTTP), tắt gọn bằng `enableShutdownHooks`.
  - `/health/ready` kiểm tra DB và Redis.
- **Test e2e:** `test/setup/global-setup.ts` bật Postgres 17 và Redis bằng Testcontainers (cần Docker), chạy migration, đưa URL qua `provide`/`inject` (`test/setup/env.ts`). Test hàng đợi dựng worker trong cùng test bằng `createWorker()`. Dựng app bằng `createTestApp()` (`test/helpers/app.ts`). Mỗi test tự tạo dữ liệu riêng, không đếm cả bảng.
- **Route:** controller thường có tiền tố `/v1` (URI versioning mặc định `1`); health check dùng `VERSION_NEUTRAL` (`/health/live`).
- **Module domain** (`src/modules/<tên>`): controller (HTTP + Swagger), service (luật, quyền, transaction), repository (nơi duy nhất đụng DB, từ phần 2), mapper (dòng DB → DTO), `dto/` (zod). Test unit đặt cạnh code, e2e đặt ở `test/<tên>/`.

## Quy ước

- Tên nhánh git tiếng Anh (kebab-case); commit message và tài liệu tiếng Việt.
- **Mỗi commit tăng version:** `npm version patch --no-git-tag-version` rồi đưa `package.json`, `package-lock.json` vào chính commit đó.
- Import alias `@/` → `src/`: cấu hình ở `tsconfig.json` (`paths`), `.swcrc` (build) và `vitest.config.ts`. TypeScript 6 bỏ `baseUrl` nên `paths` viết tương đối (`./src/*`); SWC cần `baseUrl` trong `.swcrc`.
- Build bằng SWC (`nest-cli.json` → `.swcrc`, `stripLeadingPaths`), đầu ra `dist/main.js`. Kiểm tra kiểu tách riêng (`npm run typecheck`).
- Prettier: không chấm phẩy, nháy đơn, `printWidth` 100. oxlint cho phép class rỗng có decorator (module Nest).
- Test: vitest với `globals`, `unplugin-swc` (decorator metadata của Nest). Tên test tiếng Việt, mô tả hành vi.
- Không log hay trả ra ngoài thông tin nhạy cảm (token, mật khẩu, email trong log lỗi).
