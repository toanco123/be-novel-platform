# Phần 1: Khởi tạo dự án

Trạng thái: ✅ xong (13/10/2026).

**Khác so với plan:**

- TypeScript 6 bỏ `baseUrl`: `paths` trong `tsconfig.json` viết tương đối (`./src/*`); SWC vẫn cần `baseUrl` nên build dùng `.swcrc` riêng (`nest-cli.json` → `swcrcPath`, `stripLeadingPaths` để đầu ra là `dist/main.js`).
- Thêm mã lỗi `bad_request` (JSON hỏng, `HttpException` 400 không phải lỗi validate).
- `/health/live` không dùng `@nestjs/terminus` (chưa có gì để kiểm tra); terminus dùng từ phần 2 cho `/health/ready`.

## Mục tiêu

Có một app NestJS chạy được, đủ "khung" để các phần sau chỉ việc thêm module:

- Cấu hình, log, lỗi và tài liệu API đều thống nhất ngay từ đầu.
- Phần này **chưa cần Postgres hay Redis** (có từ phần 2 và 3), nên chạy được cả trên máy chưa có Docker.

## Công việc

1. **Dự án và công cụ**
   - `package.json` (Node 24, npm, `engines`), `.nvmrc`, `.gitignore`, `git init` (nhánh `main`).
   - NestJS **11.2.x**: `@nestjs/common`, `core`, `platform-express`, `config`, `swagger`, `terminus`, `testing`; CLI dùng builder **SWC** (build nhanh, kiểm tra kiểu tách riêng bằng `tsc --noEmit`).
   - TypeScript strict (`strict`, `noUncheckedIndexedAccess`), alias `@/` → `src/`.
   - `oxlint`, `prettier` (giống web: không chấm phẩy, nháy đơn, width 100).
   - **vitest** + `unplugin-swc` (để chạy decorator của Nest), `supertest`.
2. **Cấu hình** (`src/config`)
   - Schema env bằng **zod**: `NODE_ENV`, `HOST`, `PORT` (mặc định 4000), `LOG_LEVEL`, `CORS_ORIGINS` (danh sách, ngăn bằng dấu phẩy), `TRUST_PROXY_HOPS`, `SWAGGER_ENABLED`.
   - Sai env thì dừng ngay khi khởi động, kèm báo lỗi rõ biến nào sai.
   - `AppConfig` là service có kiểu, các nơi khác không đọc `process.env` trực tiếp.
   - `.env.example` có đủ biến.
3. **Ngữ cảnh request và log**
   - `nestjs-cls`: mỗi request có `requestId`.
     - Nếu client gửi `x-request-id` hợp lệ (chữ, số, `-`, tối đa 64 ký tự) thì dùng lại; không thì tự sinh UUID.
     - Trả lại trong header `x-request-id`.
   - `nestjs-pino`: log JSON (dev dùng `pino-pretty`), mỗi dòng có `requestId`. Ẩn `authorization`, `cookie`, các trường `password` và `token`.
4. **Định dạng lỗi chung** (`src/core/errors`)
   - `error-codes.ts`: bảng `code → { status, message }`. Phần này có:
     - `validation_failed`, `unauthenticated`, `forbidden`, `not_found`, `conflict`
     - `rate_limited`, `payload_too_large`, `internal_error`, `timeout`
     - Các phần sau thêm mã của mình vào đây.
   - `AppError(code, details?)` cho service ném ra.
   - `AllExceptionsFilter` luôn trả `{ code, message, details?, requestId }`:
     - `AppError` → đúng mã.
     - Lỗi validate của zod → 400 `validation_failed`, `details.issues = [{ path, code, message }]`.
     - Route không có → 404 `not_found`.
     - `HttpException` khác → mã theo status.
     - Lỗi lạ → 500 `internal_error`, ghi log đầy đủ, không lộ chi tiết ra ngoài.
   - `message` bằng tiếng Anh, cho dev đọc. Client tự hiển thị lời tiếng Việt theo `code`, như web đang làm.
5. **Validate và Swagger**
   - `nestjs-zod`: pipe validate toàn cục; DTO tạo từ schema zod.
   - Swagger ở `/docs`, JSON ở `/openapi.json`, bật bằng `SWAGGER_ENABLED`.
   - Script `openapi:export` ghi `openapi.json` ra repo.
6. **HTTP**
   - Tiền tố phiên bản `/v1` (URI versioning, mặc định `1`).
   - `helmet`; CORS chỉ cho các origin trong `CORS_ORIGINS`, có `credentials`.
   - `trust proxy` theo env; body JSON tối đa 1 MB.
   - Tắt app gọn gàng khi nhận tín hiệu dừng.
7. **Health**
   - `GET /health/live` (không có phiên bản) → `{ status: 'ok' }`.
   - `/health/ready` để phần 2 làm (cần DB).
8. **Khởi động dùng chung**
   - `src/bootstrap.ts` gom phần cấu hình app (filter, pipe, versioning, helmet, CORS, Swagger).
   - `main.ts` gọi nó để chạy; test e2e gọi nó để dựng app giống hệt production.
9. **Tài liệu**
   - `README.md`: cài đặt, lệnh, cấu trúc.
   - `CLAUDE.md`: quy ước làm việc, tiếng Việt, cùng kiểu repo web.
   - `documents/lo-trinh.md` đánh dấu tiến độ.

## Script npm

- Chạy: `dev`, `build`, `start`
- Kiểm tra: `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`
- OpenAPI: `openapi:export`

## Kiểm tra

- **Unit:**
  - env schema: thiếu hoặc sai kiểu thì báo lỗi; danh sách CORS được tách đúng.
  - `AllExceptionsFilter`: map đúng `AppError`, lỗi zod, `HttpException`, lỗi lạ.
  - `x-request-id`: nhận giá trị hợp lệ, bỏ giá trị lạ.
- **e2e** (`supertest`, không cần DB), dựng app bằng `bootstrap` cùng một controller chỉ dùng trong test:
  - `/health/live` → 200.
  - Route không có → 404 `{ code: 'not_found', requestId }`, header `x-request-id` khớp.
  - Body sai → 400 `validation_failed` có `details.issues`.
  - Lỗi lạ → 500 `internal_error`, không lộ thông điệp gốc.
  - `/openapi.json` có endpoint của controller test.
  - CORS: origin trong danh sách được phép, origin lạ không có header CORS.
- `npm run lint && npm run format:check && npm run typecheck && npm run build && npm test && npm run test:e2e` đều qua.
- `npm run dev`, `curl localhost:4000/health/live` → 200, mở `/docs` thấy trang Swagger.

## Commit

Một commit: "Khởi tạo dự án NestJS: cấu hình, log, định dạng lỗi, Swagger, health". Version `0.0.1`.

Quy ước từ đây: mỗi commit chạy `npm version patch --no-git-tag-version`.
