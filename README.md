# be-novel-platform

Backend NestJS cho nền tảng đọc truyện chữ (web `web-novel-platform`, app `mobile-novel-platform`). Mục tiêu: thay Supabase bằng backend riêng (Postgres + Drizzle, auth riêng, lưu ảnh S3/R2), làm dần từng phần.

- Thiết kế tổng thể: [documents/thiet-ke-tong-the.md](documents/thiet-ke-tong-the.md)
- Lộ trình và tiến độ từng phần: [documents/lo-trinh.md](documents/lo-trinh.md)

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
| `npm run test:e2e`                    | Test e2e (`test/**/*.e2e-spec.ts`)                             |
| `npm run openapi:export`              | Ghi `openapi.json` (để web, mobile sinh client có kiểu)        |
| `npm run keys:generate`               | In cặp khóa ES256 mới cho `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` |
| `npm run db:up` / `db:down`           | Bật / tắt Postgres và Redis (docker-compose)                   |
| `npm run db:generate`                 | Sinh migration từ schema Drizzle (`drizzle/migrations`)        |
| `npm run db:migrate`                  | Chạy migration                                                 |
| `npm run db:studio`                   | Drizzle Studio xem dữ liệu                                     |

## Cấu trúc

```
src/
  main.ts, bootstrap.ts      # khởi động; bootstrap dùng chung cho main, test e2e, script
  app.module.ts
  config/                    # biến môi trường (zod), AppConfig
  core/                      # dùng chung: ngữ cảnh request, lỗi, HTTP, Swagger
  infra/database/            # Postgres (postgres.js + Drizzle), schema, migration, health
  infra/redis/, infra/queue/ # Redis dùng chung, hàng đợi BullMQ (tên hàng đợi ở queues.ts)
  worker.ts                  # process worker (không mở cổng HTTP)
  modules/<tên>/             # từng domain: controller, service, repository, dto
  cli/                       # script chạy bằng node (xuất OpenAPI...)
test/unit/                   # test unit, cùng cấu trúc thư mục với src/
test/                        # test e2e (Postgres thật qua Testcontainers)
drizzle/migrations/          # SQL migration (sinh bởi drizzle-kit, review trước khi commit)
documents/                   # thiết kế, lộ trình, plan từng phần (tiếng Việt)
```

## Thử API trên Swagger (`/docs`)

1. Mở `POST /v1/auth/register` (hoặc `login`), sửa email trong body, bấm **Execute**.
2. Access token tự điền vào nút **Authorize** (vẫn còn khi tải lại trang). Các route có ổ khóa gọi được ngay, vd `GET /v1/me`.
3. Access token hết hạn sau 15 phút: gọi `POST /v1/auth/refresh` với body `{}`. Trình duyệt đã có cookie refresh token nên không cần dán gì.

Ở dev không đặt `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` thì app tự sinh khóa tạm, nên token cũ hết hiệu lực mỗi lần chạy lại. Production bắt buộc đặt khóa (`npm run keys:generate`).

## Auth

- **Access token:** JWT ES256, 15 phút, gửi qua header `Authorization: Bearer <token>`. Mọi route mặc định cần đăng nhập, trừ route `@Public()`.
- **Refresh token:** 30 ngày, xoay vòng mỗi lần dùng.
  - Web nhận trong cookie HttpOnly `refresh_token` (path `/v1/auth`).
  - Mobile gửi header `X-Client: mobile` để nhận trong body, rồi gửi lại trong body của `/v1/auth/refresh`.

Chi tiết: [documents/plan-04-auth-co-ban.md](documents/plan-04-auth-co-ban.md).

## Định dạng lỗi

Mọi lỗi trả về:

```json
{
  "code": "validation_failed",
  "message": "Request validation failed",
  "details": { "issues": [] },
  "requestId": "..."
}
```

`code` ổn định, client dựa vào đó để hiển thị lời tiếng Việt. Danh sách mã ở `src/core/errors/error-codes.ts`.
