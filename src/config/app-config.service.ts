import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from './config.types'

/** Cấu hình đã kiểm tra, có kiểu: app.get(AppConfig).get('PORT') */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true })
  }

  get isProduction() {
    return this.get('NODE_ENV') === 'production'
  }

  /** Cookie refresh token có cờ Secure: theo COOKIE_SECURE, không đặt thì bật ở production */
  get cookieSecure() {
    return this.get('COOKIE_SECURE') ?? this.isProduction
  }
}
