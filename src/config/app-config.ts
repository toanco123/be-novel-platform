import { Global, Injectable, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { type Env, validateEnv } from './env.schema'

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
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validate: validateEnv,
      // Test tự đặt biến (vitest.config.ts), không đọc file .env trên máy
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
