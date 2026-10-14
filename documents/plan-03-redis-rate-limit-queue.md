# Phần 3: Redis, rate limit, hàng đợi

Trạng thái: ✅ xong (14/10/2026).

**Khác so với plan:**

- BullMQ 6 và ioredis đều nhận thẳng `REDIS_URL`, nên không cần hàm tách URL riêng.
- BullMQ dùng kết nối riêng (`maxRetriesPerRequest: null` theo yêu cầu của worker), client `REDIS` dùng chung chỉ cho rate limit và health check.
- Prefix khóa BullMQ là `novel`; khóa của `RateLimitService` có tiền tố `rl:`.

## Mục tiêu

Có Redis cho ba việc mà các phần sau cần:

1. **Chặn spam thô** cho toàn API (throttler).
2. **Hạn mức nghiệp vụ** theo người dùng, ví dụ:
   - tạo tối đa 10 thể loại mỗi ngày
   - bình luận 3 lần mỗi phút
   - đăng nhập sai 5 lần
3. **Hàng đợi job** chạy ở process riêng (`worker`): gửi email (phần 5), thông báo đẩy, xuất bản chương hẹn giờ (các đợt sau).

## Công việc

1. **Thư viện:** `ioredis`, `@nestjs/throttler`, `@nest-lab/throttler-storage-redis`, `@nestjs/bullmq`, `bullmq`; dev: `@testcontainers/redis`.
2. **Cấu hình:** `REDIS_URL` (bắt buộc, `redis://…`); `THROTTLE_LIMIT` (mặc định 300) và `THROTTLE_TTL_SECONDS` (mặc định 60).
3. **`src/infra/redis`:**
   - Module global, token `REDIS` (ioredis dùng chung cho rate limit và health), tên kết nối `novel-api`, `maxRetriesPerRequest: 2`.
   - Đóng khi app tắt.
   - Health indicator `redis` (`PING`, timeout 2 giây). `/health/ready` kiểm tra cả DB và Redis.
4. **Throttler toàn cục** (`core/rate-limit/app-throttler.guard.ts`):
   - Mặc định 300 request / 60 giây, lưu trên Redis để nhiều instance dùng chung.
   - Đếm theo người dùng khi đã đăng nhập (có từ phần 4), khách thì theo IP (`req.ip`, đã tính `trust proxy`).
   - `/health/*` không bị tính.
   - Vượt giới hạn thì 429 `rate_limited`, kèm header `Retry-After`.
   - Route cần giới hạn riêng dùng `@Throttle()` hoặc `@SkipThrottle()` của Nest.
5. **`RateLimitService`** (`core/rate-limit/rate-limit.service.ts`): hạn mức nghiệp vụ theo cửa sổ trượt (sorted set + script Lua, nguyên tử).
   - `consume(key, { limit, windowSeconds })`: còn lượt thì tính một lượt; hết thì ném `AppError('rate_limited', { retryAfterSeconds })`.
   - `peek(key, opts)`: xem còn bao nhiêu lượt, không tính.
   - `reset(key)`: vd đăng nhập đúng thì xóa đếm số lần sai.
   - Key có tiền tố `rl:` và tên hành động, vd `rl:genre:create:<userId>`.
6. **Hàng đợi** (`src/infra/queue`):
   - `BullModule.forRootAsync` nối Redis (`REDIS_URL`).
   - Tên hàng đợi tập trung ở `queues.ts`. Phần này có hàng đợi `system` với job `ping`, để kiểm tra đường đi API → Redis → worker.
   - Mặc định của job: thử lại 3 lần, backoff mũ, xóa job xong sau 1 ngày và job lỗi sau 7 ngày.
7. **Process worker:**
   - `src/worker.ts` + `worker.module.ts`, dùng `createApplicationContext` (không mở cổng HTTP).
   - Nạp config, log, DB, Redis, hàng đợi và các processor (phần này: `SystemProcessor` xử lý `ping`).
   - Tắt gọn: đóng worker, chờ job đang chạy xong.
   - Script `dev:worker`, `start:worker`.
8. **docker-compose:** thêm `redis` (`redis:7.4-alpine`, cổng 6380 trên máy, healthcheck). `db:up` bật cả `db` lẫn `redis`.
9. **Test e2e:** global setup bật thêm Redis bằng Testcontainers; `test/setup/env.ts` đặt `REDIS_URL`.

## Kiểm tra

- **Unit:** env có `REDIS_URL`; `AppThrottlerGuard` lấy đúng tracker (khách thì IP).
- **e2e:**
  - `/health/ready` có `database` và `redis` đều `up`.
  - `RateLimitService` trên Redis thật:
    - đủ lượt thì qua, lượt thứ `limit + 1` thì `rate_limited` kèm `retryAfterSeconds`
    - hết cửa sổ thì được lại (cửa sổ ngắn)
    - `reset` xóa đếm
    - `peek` không tính lượt
    - key khác nhau không ảnh hưởng nhau
  - Throttler: một route test giới hạn 3 lần, lần thứ 4 trả 429 `rate_limited` có `Retry-After`; `/health/live` không bị chặn.
  - Hàng đợi: đẩy job `ping` vào `system`, một worker chạy trong test xử lý xong và trả kết quả.
- lint, typecheck, format, build, test unit, test e2e đều qua; `npm run dev:worker` khởi động được và tắt gọn.

## Commit

"Redis, rate limit, hàng đợi BullMQ và process worker".
