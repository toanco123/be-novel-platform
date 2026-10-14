# Phần 8: Lưu ảnh (S3), Dockerfile, Docker trong CI

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- **RustFS chạy ở cổng 9010 trên máy:** máy dev đã có một S3 khác (dự án khác) ở cổng 9000.
- **Log:** chạy image với `NODE_ENV=development` (profile `app` dùng `.env`) thì log JSON, vì image không có devDependency `pino-pretty` (`logger.options.ts` kiểm tra gói có cài không).
- **Khóa JWT trong env có thể có dấu nháy bao quanh** (`docker run --env-file`, trang cấu hình của nơi deploy giữ nguyên dấu nháy): `normalizePem` bỏ dấu nháy.
- **Image 522 MB.** Tối ưu kích thước để sau (vd bỏ `swagger-ui-dist` khi tắt Swagger ở production).

## Mục tiêu

- **Hạ tầng lưu ảnh S3-compatible** (production: Cloudflare R2). Đợt này chỉ dựng hạ tầng; tải ảnh đại diện, bìa truyện làm ở đợt Sáng tác.
- **Đóng gói Docker:**
  - một image dùng cho cả API, worker và bước migration;
  - docker-compose chạy được cả app;
  - CI build image và chạy thử.
- **Hoàn thiện README, CLAUDE.md**, đóng đợt 0.

## Thiết kế

### S3 ở máy dev: RustFS thay MinIO

- Thiết kế ban đầu dùng MinIO, nhưng MinIO đã ngừng phát hành image bản cộng đồng: `minio/minio`, `quay.io/minio/minio` không còn kéo về được.
- Thay bằng **RustFS 1.0.1** (`rustfs/rustfs:1.0.1`): tương thích S3, kiểm tra chữ ký như S3 thật.
- **Đã thử ngày 14/10/2026** với `@aws-sdk/client-s3`:
  - tạo bucket, đặt quyền đọc công khai;
  - upload bằng presigned PUT;
  - sai kích thước hoặc sai `Content-Type` đã ký → 403; PUT không ký → 403;
  - đọc qua URL công khai; xóa.

### `src/infra/storage`

- **`StorageService`** (`@aws-sdk/client-s3`, `forcePathStyle`, chạy được với RustFS và R2):
  - `presignUpload({ key, contentType, size })`: presigned PUT 5 phút, ký kèm `Content-Type` và `Content-Length`. Client phải gửi đúng loại và đúng kích thước đã khai (chặn upload HTML vào chỗ để ảnh). Trả `{ uploadUrl, headers, key, publicUrl, expiresAt }`.
  - `publicUrl(key)`: `S3_PUBLIC_URL/<key>` (R2: domain công khai của bucket).
  - `head(key)`: kích thước, loại của file đã upload (null nếu chưa có), để service kiểm tra sau khi client báo upload xong.
  - `delete(key)`, `deletePrefix(prefix)`: xóa ảnh của tài khoản khi xóa tài khoản (đợt sau).
- **Một bucket** (`S3_BUCKET`), phân thư mục theo loại: `avatars/<userId>/…`, `covers/<ownerId>/…`, giống đường dẫn của Supabase Storage để chuyển dữ liệu.
- **`npm run storage:init`** (`cli/storage-init.ts`): tạo bucket nếu chưa có và cho đọc công khai. Dùng cho dev và test; R2 production tạo bucket trên Cloudflare.
- **Env:**

  | Biến                                       | Ghi chú                                                                        |
  | ------------------------------------------ | ------------------------------------------------------------------------------ |
  | `S3_ENDPOINT`                              | Dev: `http://localhost:9010`. R2: `https://<account>.r2.cloudflarestorage.com` |
  | `S3_REGION`                                | R2 dùng `auto`                                                                 |
  | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |                                                                                |
  | `S3_BUCKET`                                |                                                                                |
  | `S3_PUBLIC_URL`                            |                                                                                |

  Production không được dùng localhost.

### Docker

- **`Dockerfile`** nhiều stage, `node:24-bookworm-slim`:
  - `npm ci` → `nest build` → bỏ devDependencies;
  - image chạy bằng user `node`, `NODE_ENV=production`, có `dist`, `drizzle/migrations`, `node_modules`, `package.json`.
  - **Lệnh:**
    - mặc định: `node dist/main.js` (API, `HEALTHCHECK` gọi `/health/live`);
    - worker: `node dist/worker.js`;
    - migration: `node dist/cli/migrate.js`.
- **`.dockerignore`:** bỏ `node_modules`, `dist`, `.env*`, `test`, `documents`...
- **docker-compose:**
  - Thêm `rustfs` (cổng 9010 trên máy, tránh đụng S3 khác ở 9000; dữ liệu trong volume); `db:up` bật cả `rustfs`.
  - Profile `app` (`docker compose --profile app up`): `migrate` chạy một lần → `api` (cổng 4000) và `worker`.
  - Các service trong profile `app` dùng `.env`, đổi host sang tên service (`db`, `redis`, `mailpit`, `rustfs`).

### CI

- **Job mới `docker`:** build image, rồi chạy thử ở chế độ production:
  - sinh khóa JWT bằng chính image (`dist/cli/generate-keys.js`);
  - đặt env production giả (host không phải localhost);
  - chờ `/health/live` trả 200. Bước này kiểm tra image chạy được và cấu hình production hợp lệ.
- **Test e2e:** `global-setup` bật thêm RustFS (Testcontainers), chạy `storage:init`.

## Kiểm tra

- **e2e** (RustFS thật):
  - presign → PUT đúng → URL công khai đọc được → `head` đúng kích thước, loại;
  - PUT sai loại / sai kích thước → 403;
  - `delete`, `deletePrefix`.
- **Unit:** env S3 (production không localhost); `publicUrl`.
- **Docker:**
  - `docker build` thành công;
  - `docker compose --profile app up`: migration chạy, API `/health/ready` 200, worker gửi được thư.
- lint, typecheck, format, build, test; CI xanh cả 3 job.

## Commit

"Lưu ảnh S3 (RustFS ở máy), Dockerfile, docker-compose profile app, CI build Docker".
