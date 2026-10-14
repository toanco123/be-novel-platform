# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan

Backend **NestJS 11** cho nền tảng đọc truyện chữ, thay dần Supabase của web (`../web-novel-platform`) và app (`../mobile-novel-platform`). Đợt này **chỉ làm trong repo này**; web và mobile giữ nguyên, sẽ chuyển sang gọi BE ở các đợt sau. Người dùng giao tiếp bằng tiếng Việt; tài liệu viết bằng tiếng Việt.

- Thiết kế tổng thể: [documents/thiet-ke-tong-the.md](documents/thiet-ke-tong-the.md) — đọc trước khi làm phần mới.
- Lộ trình và tiến độ: [documents/lo-trinh.md](documents/lo-trinh.md).
- **Cách làm:** từng phần nhỏ. Trước mỗi phần viết plan `documents/plan-<số>-<tên>.md` (mục tiêu, công việc, kiểm tra), làm xong thì đánh dấu ✅ ở plan và ở lộ trình.
- Nghiệp vụ gốc (luật, giới hạn, mã lỗi) lấy từ `../web-novel-platform/documents/thiet-ke-database.md` (mục 3 bảng, 4 luật và mã lỗi, 5 quyền). BE viết lại các luật đó trong code (không RLS, không `auth.uid()`), giữ tên bảng, cột và UUID để sau này chuyển dữ liệu từ Supabase.
- **Bảng DB lấy từ Supabase** (người dùng yêu cầu 14/10/2026): bảng nào đã có trên Supabase thì lấy đúng định nghĩa (cột, kiểu, check, tên constraint) từ `../web-novel-platform/supabase/migrations/` (migration sau có thể sửa bảng, đọc hết). Bảng chưa có trên Supabase (vd `users`, `refresh_tokens`, `email_tokens` thay schema `auth` của Supabase) thì BE tự thiết kế.

## Tổ chức code (bắt buộc)

Chi tiết và ví dụ: mục **Quy ước code** trong [README.md](README.md). Tóm tắt:

- **Mỗi file chỉ làm một việc**, mỗi file một class. Tên file theo hậu tố: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.mapper.ts`, `*.rules.ts`, `*.dto.ts` (một DTO), `*.types.ts`, `*.constants.ts`, `*.decorator.ts`, `*.guard.ts`, `*.pipe.ts`, `*.health.ts`, `*.lifecycle.ts`...
- **Type / interface** chỉ nằm trong `<tên thư mục>.types.ts`; file khác `import type`. Không khai báo type trong service, controller, repository.
- **Hằng số, token inject, hạn mức** trong `*.constants.ts`.
- **Dùng chung thì vào `src/common/<mảng>/`** (`auth`, `context`, `crypto`, `errors`, `http`, `rate-limit`, `swagger`, `validation`, `utils`); chỉ một module dùng thì để trong module. Provider dùng chung khai báo trong module `@Global()` của mảng (`CryptoModule`, `ErrorsModule`).
- **DTO kiểu chuẩn của Nest:** `email: string`, không dùng `!` (`strictPropertyInitialization` tắt).
- **Response thành công bọc `{ statusCode, data, meta: { requestId } }`** (route gắn `@ResponseDto(Dto)`, bắt buộc với route trả dữ liệu; mảng không phân trang `@ResponseDto(Dto, { isArray: true })`); danh sách `{ statusCode, data: [...], meta: { total, page, pageCount, requestId } }`; lỗi `{ statusCode, error: { code, message, details? }, meta: { requestId } }`; `statusCode` luôn trùng HTTP status; 204 và `/health/*` không bọc. Chi tiết: README mục **Dạng response**.
- **Đầu vào** nhận cả camelCase lẫn snake_case (pipe đổi về camelCase trước khi validate); **đầu ra** luôn camelCase. DTO trả về dùng `@ApiField` cho mỗi trường; route trả dữ liệu dùng `@ResponseDto(Dto)` (response chỉ có trường có `@ApiField`, kể cả object con).
- **Từ 2 file cùng loại trở lên trong một thư mục** thì gom vào thư mục con số nhiều: `services/`, `repositories/`, `types/`, `guards/`, `decorators/`, `dto/`. Ngoại lệ: `app.module.ts`, `worker.module.ts` ở `src/`.
- **Import:** cùng thư mục hoặc lên một cấp trong cùng nhánh thì đường dẫn tương đối; xa hơn dùng `@/`. Test luôn dùng `@/`.
- **Test unit** ở `test/unit/`, cùng cấu trúc thư mục với `src/`; e2e ở `test/<tên module>/`.

## Lệnh

```bash
npm run dev              # dev, cổng 4000, /docs là Swagger
npm run build            # nest build (SWC) → dist/
npm run typecheck        # tsc --noEmit
npm run lint             # oxlint
npm run format           # prettier --write .
npm test                 # unit (test/unit/**/*.spec.ts)
npm run test:e2e         # e2e (test/**/*.e2e-spec.ts)
npx vitest run test/unit/common/errors/to-api-error.spec.ts   # một file
npm run openapi:export   # ghi openapi.json
npm run keys:generate    # in cặp khóa ES256 cho JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
npm run db:up            # Postgres 17 (cổng 5433) + Redis 7.4 (cổng 6380) bằng docker-compose; db:down để tắt
npm run dev:worker       # process worker (hàng đợi BullMQ)
npm run storage:init     # tạo bucket lưu ảnh (RustFS, chạy một lần)
docker compose --profile app up --build   # cả app trong Docker
npm run db:generate      # sinh migration từ schema Drizzle
npm run db:migrate       # chạy migration (build rồi node dist/cli/migrate.js)
```

## Kiến trúc

- **Khởi động:** `src/bootstrap.ts` (`createApp`, `configureApp`) gom mọi cấu hình app: requestId, body limit 1 MB, helmet, CORS, versioning `/v1`, Swagger. `main.ts`, test e2e và `cli/export-openapi.ts` đều đi qua đây để test chạy đúng như production.
- **Cấu hình:** schema `config/env.schema.ts` (zod), kiểm tra ở `config/validate-env.ts`, sai env thì dừng khi khởi động. Đọc qua `AppConfig.get('KEY')` (`config/app-config.service.ts`), không đọc `process.env` trực tiếp. Thêm biến thì sửa cả schema, `.env.example` và test của schema. Khi `NODE_ENV=test` không đọc file `.env` (biến test đặt trong `vitest.config.ts`).
- **Ngữ cảnh request:** `common/context`: `requestIdMiddleware` (`request-id.middleware.ts`) đặt `req.id` (nhận `x-request-id` hợp lệ của client hoặc tự sinh) và trả lại header; `nestjs-cls` giữ id cho filter và service; `nestjs-pino` ghi log JSON có `requestId`, `userId` (cấu hình ở `logger.options.ts`), ẩn `authorization`, cookie, mật khẩu, token.
- **Lỗi** (mọi thứ ở `common/errors/`, bảng file trong README mục **Lỗi**):
  - Service ném `AppException(code, details?)`. **Mã mới thêm vào `common/errors/error-code.ts`**; trùng unique của bảng mới thì thêm tên constraint vào `constraint-codes.ts`.
  - `AllExceptionsFilter` (toàn cục) đổi mọi lỗi qua `toApiError` → `toErrorResponse` thành `{ statusCode, error: { code, message, details? }, meta: { requestId } }`. Gồm: lỗi validate → `validation_failed` với `error.details.issues` (`validation-exception.factory.ts`), `HttpException` theo status, lỗi body-parser, lỗi Postgres (`pg-error.ts`), lỗi lạ → 500 không lộ chi tiết.
  - `message` tiếng Anh cho dev; client hiển thị tiếng Việt theo `code`.
  - **Ghi log lỗi luôn qua `ErrorLogger.log(error, context?)`** (filter, worker, service): cùng cấu trúc `{ error: { code, status, message, details? }, err, requestId, userId, ...context }`; 5xx mức error, còn lại warn.
- **Validate và OpenAPI:**
  - **DTO là class dùng class-validator + class-transformer:** mỗi trường có decorator kiểm tra (`@IsEmail()`, `@Length(2, 30)`...) và `@ApiProperty({...})` cho Swagger (không dùng plugin CLI của Nest vì build bằng SWC). Khai báo `email: string`, không có `!`.
  - `AppValidationPipe` toàn cục (`common/validation/validation.pipe.ts`): đổi khóa snake_case của body / query sang camelCase (`common/utils/case-keys.ts`), bỏ trường lạ (`whitelist`), chạy `@Transform` (`Trim()`, `NormalizeEmail()` trong `common/validation/transform.decorator.ts`), **không** đổi kiểu ngầm. Lỗi → 400 `validation_failed`, `details.issues = [{ path, code, message }]` với `code` là tên ràng buộc của class-validator (`isEmail`, `isLength`...).
  - **Đầu ra:** `ResponseInterceptor` toàn cục + `@ResponseDto(Dto)` (`common/response/`): lọc chỉ trường có `@ApiField` (= `@Expose` + `@ApiProperty`, tự thêm `@Type` cho DTO lồng) rồi bọc `{ statusCode, data, meta }`.
  - zod chỉ còn dùng cho biến môi trường (`config/env.schema.ts`).
  - Swagger ở `/docs`, `/openapi.json` (`SWAGGER_ENABLED`). Mỗi endpoint có `@ApiOperation({ summary })` tiếng Việt, `@ResponseDto(Dto)` cho response, `@ApiErrorResponses(...codes)` (`common/swagger/api-error-responses.decorator.ts`) liệt kê mã lỗi có thể trả, route cần đăng nhập có `@ApiBearerAuth()`.
  - Trên `/docs`, gọi register / login / refresh xong thì access token tự điền vào nút Authorize.
- **Database** (`src/infra/database`, plan `documents/plan-02-database.md`):
  - Một pool postgres.js; inject `@Inject(DB) db: Db` (Drizzle, `casing: 'snake_case'`). Token `DB` ở `database.constants.ts`; kiểu `Db`, `Tx` (transaction), `Executor` (= `Db | Tx`, cho repository) ở `database.types.ts`.
  - Chỉ `src/infra/database` (và test) được import `postgres` / `drizzle-orm/postgres-js` (luật `no-restricted-imports` của oxlint).
  - **Schema code-first:** mỗi bảng một file `schema/<bảng>.ts`, export ở `schema/index.ts`; kiểu dòng (`UserRow`...) ở `schema/schema.types.ts`. Dùng `timestamps` cho bảng có sửa.
  - **Migration:** `npm run db:generate` rồi review SQL trong `drizzle/migrations` (hàm, trigger thì `drizzle-kit generate --custom`). Bảng có `updated_at` thêm trigger `set_updated_at()` trong migration. `db:migrate` là bước riêng khi deploy, app không tự migrate. Sửa schema mà quên generate thì `drizzle-kit generate` sẽ ra file mới (CI kiểm tra).
  - Lỗi Postgres đi qua `pg-error.ts`: `23505` → `conflict` (hoặc mã riêng theo tên constraint trong `common/errors/constraint-codes.ts`), `23503` → `not_found`, `23514`/`22001` → `validation_failed`, `57014` → `timeout`.
  - `/health/ready` kiểm tra DB (503 `service_unavailable` khi hỏng).
- **Redis, rate limit, hàng đợi** (plan `documents/plan-03-redis-rate-limit-queue.md`):
  - `infra/redis`: client `@Inject(REDIS) redis: Redis` (ioredis) dùng chung cho rate limit và health check.
  - **Throttler toàn cục** (`AppThrottlerGuard`, lưu trên Redis): chặn spam thô, `THROTTLE_LIMIT` request mỗi `THROTTLE_TTL_SECONDS` giây. Đếm theo `req.user.id`, khách thì theo IP; bỏ qua `/health`. Route cần giới hạn riêng dùng `@Throttle({ default: { limit, ttl } })` hoặc `@SkipThrottle()`.
  - **Hạn mức nghiệp vụ** dùng `RateLimitService.consume(key, { limit, windowSeconds })`: cửa sổ trượt bằng script Lua; hết lượt thì ném `AppException('rate_limited', { retryAfterSeconds })`. Có thêm `peek` (xem, không tính) và `reset`. Key đặt theo `<domain>:<hành động>:<id>`.
  - **Hàng đợi** BullMQ (`infra/queue`): processor ghi log job lỗi bằng `@OnWorkerEvent('failed')` + `ErrorLogger`; tên hàng đợi và job ở `queue.constants.ts`; module đẩy job thì `BullModule.registerQueue` + `@InjectQueue`. Processor (`@Processor`, `extends WorkerHost`) **chỉ khai báo trong `WorkerModule`**, để API không tự xử lý job. Mặc định thử lại 3 lần, backoff mũ.
  - Worker: `src/worker.ts` (`createWorker()`, `createApplicationContext`, không có HTTP), tắt gọn bằng `enableShutdownHooks`.
  - `/health/ready` kiểm tra DB và Redis.
- **Auth** (plan `documents/plan-04-auth-co-ban.md`):
  - **Guard toàn cục** đăng ký ở `AppModule`, theo thứ tự `JwtAuthGuard` → `RolesGuard` → `EmailVerifiedGuard` → `AppThrottlerGuard`.
    - Mặc định mọi route cần access token. `@Public()` cho khách; `@Public({ ignoreToken: true })` bỏ qua cả header Authorization (route của auth).
    - Token sai hoặc hết hạn → 401 `invalid_token`, kể cả ở route `@Public()`.
    - `@Roles('admin')` sai vai trò → 403 `forbidden`.
    - `@RequireVerifiedEmail()` cho thao tác viết: chưa xác nhận email → 403 `email_not_verified` (đọc claim `ev` của access token, không truy vấn DB).
    - `@RequireCaptcha()` (`common/captcha`) cho form đăng ký, đăng nhập, quên / đổi mật khẩu, xóa tài khoản: body kế thừa `CaptchaDto` (`captchaToken`); không đặt `TURNSTILE_SECRET` thì tắt.
  - **Người gọi:** `@CurrentUser() actor: Actor` (`{ id, role, sessionId, emailVerified }`), cũng có trong CLS (`actor`). Log có `userId`.
  - **Access token:** JWT ES256 (`common/auth/token.service.ts`, khóa ở `common/crypto/jwt-keys.ts`), không truy vấn DB mỗi request. Khóa tài khoản thì thu hồi refresh token, người bị khóa mất quyền chậm nhất sau 15 phút.
  - **Refresh token** (`modules/auth`): DB chỉ lưu SHA-256; mỗi phiên là một họ token (`family_id` = `sessionId`), xoay vòng mỗi lần dùng, dùng lại token cũ thì thu hồi cả họ. Web nhận qua cookie `refresh_token`, mobile qua body (`X-Client: mobile`).
  - **Mật khẩu:** `PasswordService` (`common/crypto`): argon2id; hash bcrypt cũ (Supabase) đăng nhập đúng thì băm lại. Token bí mật gửi cho client (refresh token, sau này link email) sinh bằng `randomToken()`, DB lưu `hashToken()` (`common/crypto/secure-token.ts`).
  - **Dữ liệu tài khoản:** `UsersRepository` (`modules/users`) là nơi duy nhất truy vấn `users`, `profiles`. Kiểm tra mật khẩu hiện tại trước thao tác nhạy cảm (đổi mật khẩu, xóa tài khoản) qua `PasswordConfirmationService` (sai 5 lần / 15 phút → `rate_limited`).
- **Đăng nhập mạng xã hội** (plan `documents/plan-06-oauth.md`, code ở `modules/auth/oauth/`):
  - Google, Facebook: luồng chuyển trang (`authorize` → provider → `callback` → `redirect_to?code` → `exchange` với PKCE của client). `state` và mã một lần lưu Redis (`OAuthStoreService`, GETDEL).
  - Apple: id token + nonce (`/oauth/apple/token`).
  - Client gọi provider ở `oauth/providers/*.client.ts`, id token xác minh bằng JWKS (`jose`). Test thay client bằng bản giả: `createTestApp(undefined, [{ provide: GoogleOAuthClient, useValue: fake }])`.
  - Tìm / liên kết / tạo tài khoản ở `OAuthService.resolveUser` (bảng `oauth_accounts`); mở phiên bằng `AuthService.signIn`; trả phiên chung qua `sessionResponse`.
- **Lưu ảnh** (plan `documents/plan-08-storage-docker.md`): `StorageService` (`infra/storage`, AWS SDK v3, path-style) với RustFS ở dev / test (cổng 9010, MinIO đã ngừng phát hành image) và R2 ở production. Upload bằng presigned PUT ký kèm `Content-Type`, `Content-Length` (sai → 403). Bucket dev / test tạo bằng `ensurePublicBucket` (`npm run storage:init`, global-setup của e2e).
- **Docker:** một image cho API / worker / migration (`Dockerfile`); `docker compose --profile app up --build` chạy cả app. Image không có devDependency nên log luôn là JSON (không có pino-pretty).
- **Email** (plan `documents/plan-05-email.md`):
  - API dựng thư (template ở `modules/auth/templates/`, khung chung `mail-layout.template.ts`, chữ người dùng nhập luôn qua `escapeHtml`) rồi đẩy vào hàng đợi `mail` bằng `MailQueueService` (`infra/mail`). Worker gửi qua SMTP (`MailerService`, `MailProcessor`), lỗi thì thử lại và ghi `ErrorLogger`.
  - Link trong thư: `EmailTokenService` (`createLink` / `consume`), bảng `email_tokens` lưu SHA-256, dùng một lần; link sai, hết hạn, đã dùng → 400 `invalid_link`.
  - Dev xem thư ở Mailpit (http://localhost:8025); test e2e đọc thư qua API của Mailpit (`test/helpers/mailpit.ts`, cần chạy `createWorker()` trong file test).
- **Test e2e:** `test/setup/global-setup.ts` bật Postgres 17, Redis, Mailpit và RustFS bằng Testcontainers (cần Docker), chạy migration, đưa URL qua `provide`/`inject` (`test/setup/env.ts`). Test hàng đợi dựng worker trong cùng test bằng `createWorker()`. Dựng app bằng `createTestApp(rootModule?, overrides?)` (`test/helpers/app.ts`, dùng `Test.createTestingModule` để thay provider bằng bản giả). Mỗi test tự tạo dữ liệu riêng, không đếm cả bảng.
  - Tạo người dùng bằng `registerUser(app)` (`test/helpers/auth.ts`): email và IP riêng mỗi lần. Test bật `TRUST_PROXY_HOPS=1`, nên giả IP bằng `X-Forwarded-For` để hạn mức theo IP không đụng nhau.
  - Controller chỉ dùng trong test cần `@Public()` nếu không muốn đăng nhập.
- **Route:** controller thường có tiền tố `/v1` (URI versioning mặc định `1`); health check dùng `VERSION_NEUTRAL` (`/health/live`).
- **Module domain** (`src/modules/<tên>`): controller (HTTP + Swagger), service (luật, quyền, transaction; từ 2 service thì vào `services/`), repository (nơi duy nhất đụng DB), mapper (dòng DB → DTO), `dto/` (class-validator, mỗi DTO một file), `<tên>.types.ts`, `<tên>.constants.ts`. Module mẫu đơn giản nhất: `src/modules/genres` (plan `documents/plan-07-genres.md`); module có nhiều phần: `src/modules/auth`.
- **Danh sách có phân trang:** query kế thừa `PageQueryDto` (`common/pagination`), repository nhận `pageWindow(query)`, service trả `Page<T>`, route gắn `@ResponsePage(Dto)` (`common/response/decorators/`) → `{ statusCode, data: [...], meta: { total, page, pageSize, pageCount, requestId } }`.
- **Slug** dùng `slugify` (`common/utils/slugify.ts`, giống web). DB có hàm SQL `slugify(text)` cùng kết quả (migration `0007_catalog_functions`, có test so sánh).
- **Truyện, chương** (đợt 1, plan `documents/plan-09-truyen-chuong.md`):
  - Bảng `stories`, `story_genres`, `chapters`, `story_stats`, `chapter_views`, `curated_stories` lấy đúng Supabase. Khóa ngoại đặt tên như Supabase (`foreignKey({ name: '<bảng>_<cột>_fkey' })`), index `desc` ghi `.desc().nullsFirst()` cho khớp `desc` của Postgres.
  - **Số liệu suy ra để ở trigger DB** (`stories_create_stats`, `chapters_after_change`: `story_stats` theo chương đã xuất bản, chương hẹn giờ sớm nhất, `stories.updated_at`). **Luật nghiệp vụ** của trigger Supabase (công khai, duyệt, gỡ, khóa số chương, tối đa 5 thể loại, `published_at` của chương) viết trong service ở đợt Sáng tác.
  - `StoriesRepository` dựng thẻ truyện (tương đương view `story_cards`: truyện + tên chủ + số liệu + thể loại gom `jsonb_agg`); `StoriesMapper` đổi sang DTO (URL bìa = `S3_PUBLIC_URL/covers/<cover_path>`, `author.slug` = `tac-gia-<ownerId>[-<slug bút danh>]` như web). Điều kiện "truyện công khai có chương" dùng chung: `isPublicStory()` (`modules/stories/public-story.ts`).
  - Ai xem được: `canViewStory` (`stories.rules.ts`); không xem được trả 404 như không tồn tại.
  - **Danh sách** (plan `documents/plan-11-danh-sach-truyen.md`): `GET /v1/stories` (lọc, sắp xếp `SORT_ORDER` trong `stories.repository.ts`, luôn thêm `id` cuối), `GET /v1/curated-stories` (đường dẫn riêng để không đụng slug truyện; trống thì tự chọn theo `CURATED_FALLBACK`). Lọc tác giả theo `author.slug` (`parseAuthorSlug`): cùng chủ + cùng `slugify(author_name)` (hàm SQL). `exists(...)` của Drizzle không tự thêm ngoặc cho SQL thô: viết `sql\`exists (select ...)\``.
  - **Tìm kiếm, xếp hạng, liên quan** (plan `documents/plan-12-tim-kiem-xep-hang.md`): `/v1/search` (điểm `searchScore` trên `search_title`, tên tác giả qua hàm SQL `slugify`), `/v1/ranking` và `/v1/stories/:slug/related` (`StoryRankingRepository` trả id + giá trị theo thứ tự, thẻ lấy bằng `StoriesRepository.cardsByIds` giữ thứ tự). Kỳ xếp hạng tính trong SQL theo giờ Việt Nam như Supabase. Xếp hạng theo phiếu đề cử để đợt Phần thưởng.
  - Test tạo dữ liệu thẳng vào DB: `createStory(db, {...})`, `createGenre(db)` (`test/helpers/stories.ts`); quản trị viên: `adminUser(app)`.
- **Chương cho người đọc** (plan `documents/plan-10-chuong-nguoi-doc.md`, module `src/modules/chapters`, import `StoriesModule` để dùng `StoriesRepository` / `StoriesMapper`):
  - Ai xem được truyện thì đọc được chương **đã xuất bản**; chương nháp không bao giờ hiện cho người đọc. Không đọc được → 404.
  - Route tĩnh (`contents`) khai báo trước `:number`; `:number` validate bằng `ChapterParamsDto` (1–99999, sai → 400 `validation_failed`).
  - **Lượt đọc** (`ChapterViewsService`): chống đếm lặp bằng Redis `SET NX EX` (`views:seen:<ngày>:<storyId>:<số>:<người xem>`, 2 ngày) thay bảng `private.chapter_view_log`; người xem `u:<id>` / `ip:<SHA-256>` / `unknown`. Ghi DB lỗi thì xóa khóa. Ngày theo giờ Việt Nam: `vietnamDate()` (`common/utils/vietnam-date.ts`).

## Quy ước

- Tên nhánh git tiếng Anh (kebab-case); commit message và tài liệu tiếng Việt.
- **Mỗi phần mới làm trên nhánh riêng** (người dùng yêu cầu 14/10/2026): tạo nhánh từ `main` → commit trên nhánh → push nhánh, mở pull request (`gh pr create`) để CI chạy → CI xanh thì merge vào `main` bằng merge commit "Gộp nhánh <tên nhánh>" (`gh pr merge --merge`), commit gộp không tăng version → `git checkout main && git pull`.
- **Mỗi commit tăng version:** `npm version patch --no-git-tag-version` rồi đưa `package.json`, `package-lock.json` vào chính commit đó.
- Import alias `@/` → `src/`: cấu hình ở `tsconfig.json` (`paths`), `.swcrc` (build) và `vitest.config.ts`. TypeScript 6 bỏ `baseUrl` nên `paths` viết tương đối (`./src/*`); SWC cần `baseUrl` trong `.swcrc`.
- Build bằng SWC (`nest-cli.json` → `.swcrc`, `stripLeadingPaths`), đầu ra `dist/main.js`. Kiểm tra kiểu tách riêng (`npm run typecheck`).
- Prettier: không chấm phẩy, nháy đơn, `printWidth` 100. oxlint cho phép class rỗng có decorator (module Nest).
- Test: vitest với `globals`, `unplugin-swc` (decorator metadata của Nest). Tên test tiếng Việt, mô tả hành vi.
- Không log hay trả ra ngoài thông tin nhạy cảm (token, mật khẩu, email trong log lỗi).
- **CI** (`.github/workflows/ci.yml`, plan `documents/plan-05-1-ci.md`): push `main` / pull request chạy lint, format, typecheck, build, test unit, kiểm tra migration khớp schema, test e2e (gồm `test/openapi.e2e-spec.ts`: `openapi.json` phải khớp API), build Docker và chạy thử image ở chế độ production. Đổi API thì chạy `npm run openapi:export` (sau khi tăng version) rồi commit file.
