// Kiểm tra biến môi trường khi khởi động: sai thì dừng ngay, báo rõ biến nào sai.
import { z } from 'zod'
import type { Env } from './config.types'
import { envSchema } from './env.schema'

/** Dùng cho ConfigModule.forRoot({ validate }) */
export function validateEnv(raw: Record<string, unknown>): Env {
  // Biến để trống trong .env (`KEY=`) coi như không đặt, để dùng giá trị mặc định
  const defined = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''))
  const result = envSchema.safeParse(defined)
  if (!result.success) {
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
