# be-novel-platform

Backend NestJS cho nền tảng đọc truyện chữ (web `web-novel-platform`, app `mobile-novel-platform`). Mục tiêu: thay Supabase bằng backend riêng (Postgres + Drizzle, auth riêng, lưu ảnh S3/R2), làm dần từng phần.

- Thiết kế tổng thể: [documents/thiet-ke-tong-the.md](documents/thiet-ke-tong-the.md)
- Lộ trình và tiến độ từng phần: [documents/lo-trinh.md](documents/lo-trinh.md)

## Yêu cầu

- Node 24 (`.nvmrc`), npm
- Docker (OrbStack hoặc Docker Desktop): Postgres cho dev (docker-compose) và test e2e (Testcontainers)

## Bắt đầu

```bash
npm ci
cp .env.example .env
npm run db:up          # Postgres 17 ở cổng 5433
npm run db:migrate
npm run dev            # http://localhost:4000, tài liệu API ở /docs
```

## Lệnh

| Lệnh                              | Việc                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `npm run dev`                     | Chạy dev, tự build lại khi sửa                          |
| `npm run build` / `npm start`     | Build (SWC) ra `dist/` / chạy bản build                 |
| `npm run typecheck`               | Kiểm tra kiểu (`tsc --noEmit`)                          |
| `npm run lint`                    | oxlint                                                  |
| `npm run format` / `format:check` | prettier                                                |
| `npm test`                        | Test unit (`src/**/*.spec.ts`)                          |
| `npm run test:e2e`                | Test e2e (`test/**/*.e2e-spec.ts`)                      |
| `npm run openapi:export`          | Ghi `openapi.json` (để web, mobile sinh client có kiểu) |
| `npm run db:up` / `db:down`       | Bật / tắt Postgres (docker-compose)                     |
| `npm run db:generate`             | Sinh migration từ schema Drizzle (`drizzle/migrations`) |
| `npm run db:migrate`              | Chạy migration                                          |
| `npm run db:studio`               | Drizzle Studio xem dữ liệu                              |

## Cấu trúc

```
src/
  main.ts, bootstrap.ts      # khởi động; bootstrap dùng chung cho main, test e2e, script
  app.module.ts
  config/                    # biến môi trường (zod), AppConfig
  core/                      # dùng chung: ngữ cảnh request, lỗi, HTTP, Swagger
  infra/database/            # Postgres (postgres.js + Drizzle), schema, migration, health
  modules/<tên>/             # từng domain: controller, service, repository, dto
  cli/                       # script chạy bằng node (xuất OpenAPI...)
test/                        # test e2e (Postgres thật qua Testcontainers)
drizzle/migrations/          # SQL migration (sinh bởi drizzle-kit, review trước khi commit)
documents/                   # thiết kế, lộ trình, plan từng phần (tiếng Việt)
```

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
