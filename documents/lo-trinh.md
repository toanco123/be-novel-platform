# Lộ trình backend

Thiết kế tổng thể (đã duyệt 13/10/2026): [thiet-ke-tong-the.md](thiet-ke-tong-the.md).

Cách làm: chia thành từng phần nhỏ. Mỗi phần có plan riêng trong `documents/plan-<số>-<tên>.md`, viết trước khi làm. Xong phần nào thì đánh dấu ✅ ở đây và trong plan của phần đó.

## Đợt 0: nền móng + Auth + module mẫu ✅ (xong 14/10/2026)

| Phần | Nội dung                                                                                                                                                             | Plan                                                                   | Trạng thái |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 1    | Khởi tạo dự án: NestJS 11 + SWC, TypeScript strict, lint, format, vitest, config env, log có `requestId`, định dạng lỗi chung, Swagger, helmet, CORS, `/health/live` | [plan-01-khoi-tao.md](plan-01-khoi-tao.md)                             | ✅         |
| 2    | Database: Postgres 17 + Drizzle, migration, docker-compose, `/health/ready`, test e2e bằng Testcontainers                                                            | [plan-02-database.md](plan-02-database.md)                             | ✅         |
| 3    | Redis, rate limit (throttler + `RateLimitService`), BullMQ và process `worker`                                                                                       | [plan-03-redis-rate-limit-queue.md](plan-03-redis-rate-limit-queue.md) | ✅         |
| 4    | Auth cơ bản: users, profiles, đăng ký, đăng nhập, refresh token xoay vòng, đăng xuất, guard, `/v1/me`                                                                | [plan-04-auth-co-ban.md](plan-04-auth-co-ban.md)                       | ✅         |
| 4.1  | Kiểm soát đầu vào, đầu ra: body / query nhận camelCase lẫn snake_case, response chỉ có trường khai báo trong DTO (`@ResponseDto`, `@ApiField`)                       | [plan-04-1-dau-vao-dau-ra.md](plan-04-1-dau-vao-dau-ra.md)             | ✅         |
| 5    | Email: Mailpit, hàng đợi mail, xác nhận email, quên và đặt lại mật khẩu, đổi mật khẩu, captcha Turnstile                                                             | [plan-05-email.md](plan-05-email.md)                                   | ✅         |
| 5.1  | CI GitHub Actions: lint, format, typecheck, build, test unit, e2e (Testcontainers); kiểm tra migration và `openapi.json` khớp code                                   | [plan-05-1-ci.md](plan-05-1-ci.md)                                     | ✅         |
| 6    | OAuth: Google và Facebook (chuyển trang + PKCE, web và app), Apple (id token, app); liên kết tài khoản theo email                                                    | [plan-06-oauth.md](plan-06-oauth.md)                                   | ✅         |
| 7    | Module mẫu `genres` (đủ mọi lớp, làm khuôn cho các module sau) và phân trang dùng chung                                                                              | [plan-07-genres.md](plan-07-genres.md)                                 | ✅         |
| 8    | Lưu ảnh S3 (RustFS ở máy, R2 production), Dockerfile, docker-compose profile app, build và chạy thử Docker trong CI; README, CLAUDE.md hoàn chỉnh                    | [plan-08-storage-docker.md](plan-08-storage-docker.md)                 | ✅         |

## Đợt 1: đọc công khai 🚧

Người đọc (kể cả khách) xem truyện, chương, danh sách, tìm kiếm, xếp hạng; ghi lượt đọc. Bảng lấy đúng từ Supabase. Chưa có API ghi truyện / chương (đợt 3, Sáng tác): test tạo dữ liệu thẳng vào DB.

| Phần | Nội dung                                                                                                                                                                  | Plan                                                       | Trạng thái |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| 9    | Bảng truyện, thể loại của truyện, chương, số liệu, lượt đọc, truyện chọn tay (đúng Supabase); trigger tự tính số liệu; `GET /v1/stories/:slug`; `storyCount` cho thể loại | [plan-09-truyen-chuong.md](plan-09-truyen-chuong.md)       | ✅         |
| 10   | Chương cho người đọc: mục lục, đọc một chương (kèm chương trước / sau), tải nhiều chương (đọc offline), ghi lượt đọc (1 / người hoặc IP / chương / ngày)                  | [plan-10-chuong-nguoi-doc.md](plan-10-chuong-nguoi-doc.md) | ✅         |
| 11   | Danh sách truyện: lọc (trạng thái, thể loại, độ dài, tác giả), sắp xếp; truyện chọn tay cho trang chủ (danh sách trống thì tự chọn như web)                               | viết khi bắt đầu phần                                      |            |
| 12   | Tìm kiếm không dấu (chấm điểm như web, kèm thể loại khớp), bảng xếp hạng (lượt đọc theo tuần / tháng / tất cả, điểm, người theo dõi), truyện liên quan                    | viết khi bắt đầu phần                                      |            |

Xếp hạng theo phiếu đề cử làm ở đợt 4 (cần bảng `story_votes`).

## Các đợt sau

Xem mục 8 của [thiet-ke-tong-the.md](thiet-ke-tong-the.md): hoạt động người đọc → Sáng tác và lưu ảnh → phần thưởng, thông báo, job → quản trị → chuyển dữ liệu từ Supabase → chuyển web và mobile sang gọi BE.
