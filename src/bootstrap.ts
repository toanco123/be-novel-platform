// Dựng app: dùng chung cho main.ts (chạy thật), test e2e và script xuất OpenAPI, để test chạy
// đúng cấu hình như production.
import { type Type, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { AppConfig } from './config/app-config'
import { requestIdMiddleware, REQUEST_ID_HEADER } from './core/context/request-id'
import { setupSwagger } from './core/http/swagger'

/** Giới hạn body JSON; route cần lớn hơn (nhập truyện) tự đặt riêng ở các phần sau */
export const BODY_LIMIT = '1mb'

export async function createApp(rootModule: Type = AppModule) {
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    bufferLogs: true,
    bodyParser: false,
  })
  configureApp(app)
  return app
}

export function configureApp(app: NestExpressApplication) {
  const config = app.get(AppConfig)
  app.useLogger(app.get(Logger))

  // Chạy trước mọi middleware khác: log và CLS đọc req.id
  app.use(requestIdMiddleware)
  const hops = config.get('TRUST_PROXY_HOPS')
  if (hops > 0) app.set('trust proxy', hops)

  app.useBodyParser('json', { limit: BODY_LIMIT })
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true })
  // API chỉ trả JSON; tắt CSP để trang /docs (Swagger UI) chạy được
  app.use(helmet({ contentSecurityPolicy: false }))

  const origins = new Set(config.get('CORS_ORIGINS'))
  app.enableCors({
    // Không có Origin (app di động, curl, server gọi server) thì cho qua; trình duyệt phải đúng danh sách
    origin: (origin, callback) => callback(null, !origin || origins.has(origin)),
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
  })

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
  app.enableShutdownHooks()
  if (config.get('SWAGGER_ENABLED')) setupSwagger(app)
  return app
}
