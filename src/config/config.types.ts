import type { z } from 'zod'
import type { envSchema } from './env.schema'

/** Biến môi trường đã kiểm tra, có kiểu */
export type Env = z.infer<typeof envSchema>
