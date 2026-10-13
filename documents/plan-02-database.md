# Phần 2: Database

Trạng thái: chờ làm. Cần Docker (OrbStack) trên máy.

## Mục tiêu

BE có Postgres riêng, quản lý schema bằng **Drizzle** (code-first, migration nằm trong repo), cùng môi trường dev chạy bằng docker-compose và test e2e chạy trên Postgres thật (Testcontainers). Phần này chưa có bảng nghiệp vụ nào: bảng `users`, `profiles` để phần 4 (Auth), `genres` để phần 7.

## Công việc

1. **Thư viện:** `drizzle-orm`, `postgres` (postgres.js), dev: `drizzle-kit`, `@testcontainers/postgresql`.
2. **Cấu hình:** thêm vào env schema:
   - `DATABASE_URL` (bắt buộc)
   - `DB_POOL_MAX` (mặc định 10)
   - `DB_STATEMENT_TIMEOUT_MS` (mặc định 15000)
   - `.env.example` dùng URL của Postgres trong docker-compose.
3. **`src/infra/database`:**
   - `database.module.ts` (global): tạo một pool postgres.js theo cấu hình (`max`, `statement_timeout`, `application_name`), đóng pool khi app tắt (`onApplicationShutdown`).
   - Token inject `DB` → Drizzle (`drizzle(client, { schema, casing: 'snake_case' })`). Kiểu `Db` và `Tx` dùng chung cho cả db lẫn transaction.
   - `schema/index.ts` gom schema các bảng (phần này để trống, có hàm `timestamps()` dùng chung: `created_at`, `updated_at`).
   - Lint: `no-restricted-imports` cấm import `postgres` và `drizzle-orm/postgres-js` ngoài `src/infra/database`.
4. **Migration:**
   - `drizzle.config.ts` (schema → `drizzle/migrations`, `casing: 'snake_case'`).
   - Migration đầu (`--custom`): bật extension `citext`, `pgcrypto`; hàm `set_updated_at()` dùng chung cho trigger `updated_at`.
   - Script:

     | Script              | Việc                                                                                                                                                                |
     | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
     | `db:generate`       | `drizzle-kit generate`                                                                                                                                              |
     | `db:migrate`        | chạy migration bằng `migrate()` của `drizzle-orm/postgres-js/migrator` qua `dist/cli/migrate.js` (chạy được trong Docker image, không cần drizzle-kit ở production) |
     | `db:studio`         | `drizzle-kit studio`                                                                                                                                                |
     | `db:up` / `db:down` | `docker compose up -d` / `down`                                                                                                                                     |

   - Migration chạy như một bước riêng, **không tự chạy khi app khởi động**.
5. **docker-compose.yml** (bản đầu, các phần sau thêm Redis, MinIO, Mailpit): `db` = `postgres:17-alpine`, cổng 5433 trên máy (tránh đụng Postgres khác), volume riêng, healthcheck `pg_isready`.
6. **Health:** `GET /health/ready` bằng `@nestjs/terminus`: kiểm tra DB (`select 1`, timeout 2 giây); lỗi thì 503 kèm chi tiết từng thành phần.
7. **Lỗi DB:** `core/errors/pg-error.ts`: tìm lỗi Postgres trong `err.cause` (Drizzle bọc lại) và đổi sang mã của API:

   | Mã Postgres | Kết quả                                                                                                                 |
   | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
   | `23505`     | `conflict`, trừ khi tên constraint nằm trong bảng `CONSTRAINT_CODES` (phần sau thêm, vd `genres_pkey` → `genre_exists`) |
   | `23503`     | `not_found`                                                                                                             |
   | `23514`     | `validation_failed`                                                                                                     |
   | `57014`     | `timeout`                                                                                                               |

   `toApiError` gọi qua hàm này.

8. **Test e2e:**
   - `test/setup/global-setup.ts` khởi động `postgres:17-alpine` bằng Testcontainers, chạy migration, rồi truyền `DATABASE_URL` cho các file test.
   - `test/helpers/app.ts`: `createTestApp()` dùng chung (dựng bằng `createApp`).

## Kiểm tra

- **Unit:** `pg-error` (đủ các mã ở mục 7, lỗi bọc trong `cause`, lỗi không phải Postgres giữ nguyên); env schema có `DATABASE_URL`.
- **e2e:**
  - `/health/ready` → 200 khi DB chạy.
  - Migration tạo đủ extension và hàm `set_updated_at`.
  - Transaction rollback khi lỗi.
  - Lỗi unique thật từ Postgres → 409 `conflict` qua filter (bảng tạm tạo trong test).
- `npm run db:up && npm run db:migrate` chạy sạch; `npm run db:generate` không sinh thêm file.
- lint, typecheck, build, test unit, test e2e đều qua.

## Commit

"Database: Postgres + Drizzle, migration, docker-compose, /health/ready".
