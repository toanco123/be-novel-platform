# Lộ trình backend

Thiết kế tổng thể (đã duyệt 13/10/2026): [thiet-ke-tong-the.md](thiet-ke-tong-the.md).

Cách làm: chia thành từng phần nhỏ. Mỗi phần có plan riêng trong `documents/plan-<số>-<tên>.md`, viết trước khi làm. Xong phần nào thì đánh dấu ✅ ở đây và trong plan của phần đó.

## Đợt 0: nền móng + Auth + module mẫu

| Phần | Nội dung                                                                                                                                                             | Plan                                                                   | Trạng thái |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 1    | Khởi tạo dự án: NestJS 11 + SWC, TypeScript strict, lint, format, vitest, config env, log có `requestId`, định dạng lỗi chung, Swagger, helmet, CORS, `/health/live` | [plan-01-khoi-tao.md](plan-01-khoi-tao.md)                             | ✅         |
| 2    | Database: Postgres 17 + Drizzle, migration, docker-compose, `/health/ready`, test e2e bằng Testcontainers                                                            | [plan-02-database.md](plan-02-database.md)                             | ✅         |
| 3    | Redis, rate limit (throttler + `RateLimitService`), BullMQ và process `worker`                                                                                       | [plan-03-redis-rate-limit-queue.md](plan-03-redis-rate-limit-queue.md) | ✅         |
| 4    | Auth cơ bản: users, profiles, đăng ký, đăng nhập, refresh token xoay vòng, đăng xuất, guard, `/v1/me`                                                                | [plan-04-auth-co-ban.md](plan-04-auth-co-ban.md)                       | ✅         |
| 4.1  | Kiểm soát đầu vào, đầu ra: body / query nhận camelCase lẫn snake_case, response chỉ có trường khai báo trong DTO (`@ResponseDto`, `@ApiField`)                       | [plan-04-1-dau-vao-dau-ra.md](plan-04-1-dau-vao-dau-ra.md)             | 🚧         |
| 5    | Email: Mailpit, hàng đợi mail, xác nhận email, quên và đặt lại mật khẩu, đổi mật khẩu, captcha Turnstile                                                             | [plan-05-email.md](plan-05-email.md)                                   | ✅         |
| 5.1  | CI GitHub Actions: lint, format, typecheck, build, test unit, e2e (Testcontainers); kiểm tra migration và `openapi.json` khớp code                                   | [plan-05-1-ci.md](plan-05-1-ci.md)                                     | 🚧         |
| 6    | OAuth: Google và Facebook (chuyển trang + PKCE, web và app), Apple (id token, app); liên kết tài khoản theo email                                                    | [plan-06-oauth.md](plan-06-oauth.md)                                   | ✅         |
| 7    | Module mẫu `genres` (đủ mọi lớp, làm khuôn cho các module sau) và phân trang dùng chung                                                                              | [plan-07-genres.md](plan-07-genres.md)                                 | ✅         |
| 8    | Storage S3/MinIO, Dockerfile (+ docker build trong CI), README, CLAUDE.md hoàn chỉnh                                                                                 |                                                                        |            |

## Các đợt sau

Xem mục 8 của [thiet-ke-tong-the.md](thiet-ke-tong-the.md): đọc công khai → hoạt động người đọc → Sáng tác và lưu ảnh → phần thưởng, thông báo, job → quản trị → chuyển dữ liệu từ Supabase → chuyển web và mobile sang gọi BE.
