# Lộ trình backend

Thiết kế tổng thể (đã duyệt 13/10/2026): [thiet-ke-tong-the.md](thiet-ke-tong-the.md).

Cách làm: chia thành từng phần nhỏ. Mỗi phần có plan riêng trong `documents/plan-<số>-<tên>.md`, viết trước khi làm. Xong phần nào thì đánh dấu ✅ ở đây và trong plan của phần đó.

## Đợt 0: nền móng + Auth + module mẫu

| Phần | Nội dung                                                                                                                                                             | Plan                                       | Trạng thái |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| 1    | Khởi tạo dự án: NestJS 11 + SWC, TypeScript strict, lint, format, vitest, config env, log có `requestId`, định dạng lỗi chung, Swagger, helmet, CORS, `/health/live` | [plan-01-khoi-tao.md](plan-01-khoi-tao.md) | ✅         |
| 2    | Database: Postgres 17 + Drizzle, migration, docker-compose, `/health/ready`, test e2e bằng Testcontainers                                                            |                                            |            |
| 3    | Redis, rate limit (throttler + `RateLimitService`), BullMQ và process `worker`                                                                                       |                                            |            |
| 4    | Auth cơ bản: users, profiles, đăng ký, đăng nhập, refresh token xoay vòng, đăng xuất, guard, `/v1/me`                                                                |                                            |            |
| 5    | Email: Mailpit, hàng đợi mail, xác nhận email, quên và đặt lại mật khẩu, đổi mật khẩu, captcha Turnstile                                                             |                                            |            |
| 6    | OAuth: Google và Facebook (web, redirect + PKCE), id token cho mobile (Google, Apple, Facebook)                                                                      |                                            |            |
| 7    | Module mẫu `genres` (đủ mọi lớp, làm khuôn cho các module sau)                                                                                                       |                                            |            |
| 8    | Storage S3/MinIO, Dockerfile, CI GitHub Actions, README, CLAUDE.md hoàn chỉnh; đẩy lên GitHub                                                                        |                                            |            |

## Các đợt sau

Xem mục 8 của [thiet-ke-tong-the.md](thiet-ke-tong-the.md): đọc công khai → hoạt động người đọc → Sáng tác và lưu ảnh → phần thưởng, thông báo, job → quản trị → chuyển dữ liệu từ Supabase → chuyển web và mobile sang gọi BE.
