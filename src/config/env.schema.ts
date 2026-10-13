// Biến môi trường của app, kiểm tra bằng zod khi khởi động: sai thì dừng ngay, báo rõ biến nào sai.
// Các nơi khác đọc cấu hình qua AppConfig, không đọc process.env trực tiếp.
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

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Origin được phép gọi API (CORS); trống: không cho trình duyệt nào gọi khác origin */
  CORS_ORIGINS: csv.default([]),
  /** Số proxy đứng trước app; 0: chạy thẳng, không tin header X-Forwarded-For */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  /** Bật /docs và /openapi.json */
  SWAGGER_ENABLED: flag.default(true),
})

export type Env = z.infer<typeof envSchema>

/** Dùng cho ConfigModule.forRoot({ validate }) */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
