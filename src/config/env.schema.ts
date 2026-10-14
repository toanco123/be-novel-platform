// Schema biến môi trường (zod). Kiểm tra khi khởi động ở validate-env.ts; các nơi khác đọc cấu hình
// qua AppConfig, không đọc process.env trực tiếp.
import { z } from 'zod'

/** "a, b,,c" → ['a', 'b', 'c'] */
const csv = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
)

/** "true" / "1" → true, "false" / "0" → false */
const flag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    /** Origin được phép gọi API (CORS); trống: không cho trình duyệt nào gọi khác origin */
    CORS_ORIGINS: csv.default([]),
    /** Số proxy đứng trước app; 0: chạy thẳng, không tin header X-Forwarded-For */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    /** Bật /docs và /openapi.json */
    SWAGGER_ENABLED: flag.default(true),

    /** postgres://user:pass@host:port/db */
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'Phải là URL postgres:// hoặc postgresql://'),
    /** Số kết nối tối đa của pool (mỗi process api / worker) */
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    /** Câu lệnh chạy quá lâu thì Postgres hủy (lỗi 57014 → mã timeout) */
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(15_000),

    /** redis://[:pass@]host:port[/db] hoặc rediss:// (TLS): rate limit và hàng đợi */
    REDIS_URL: z.string().regex(/^rediss?:\/\//, 'Phải là URL redis:// hoặc rediss://'),
    /** Chặn spam thô toàn API: tối đa THROTTLE_LIMIT request mỗi THROTTLE_TTL_SECONDS giây */
    THROTTLE_LIMIT: z.coerce.number().int().min(1).default(300),
    THROTTLE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),

    /**
     * Khóa ký access token (ES256, PEM: PKCS8 / SPKI; xuống dòng viết "\\n" cũng được).
     * Tạo bằng `npm run keys:generate`. Dev / test để trống thì app tự sinh khóa tạm mỗi lần chạy.
     */
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    /** Id của cặp khóa (header `kid`), đổi khi xoay khóa */
    JWT_KEY_ID: z.string().min(1).default('dev'),
    JWT_ISSUER: z.string().min(1).default('novel-api'),
    JWT_AUDIENCE: z.string().min(1).default('novel-clients'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    /** Cookie refresh token chỉ gửi qua HTTPS; mặc định bật ở production */
    COOKIE_SECURE: flag.optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && (!env.JWT_PRIVATE_KEY || !env.JWT_PUBLIC_KEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_PRIVATE_KEY'],
        message: 'Production bắt buộc có JWT_PRIVATE_KEY và JWT_PUBLIC_KEY (npm run keys:generate)',
      })
    }
  })
