// Ngữ cảnh theo request (nestjs-cls) và log (nestjs-pino). CLS giữ requestId để mọi nơi đọc được
// (filter lỗi, service), không phải truyền tay; JwtAuthGuard thêm actor (người đang gọi API).
import { Global, Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { LoggerModule } from 'nestjs-pino'
import { AppConfig } from '@/config/app-config'
import type { AuthenticatedRequest } from '../auth/actor'
import type { RequestWithId } from './request-id'

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req) => (req as RequestWithId).id,
      },
    }),
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          // Dev: log dễ đọc; production: JSON một dòng
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
          genReqId: (req) => (req as RequestWithId).id,
          customAttributeKeys: { reqId: 'requestId' },
          // Người gọi (JwtAuthGuard gắn req.user); tính lại khi request xong nên có userId
          customProps: (req) => {
            const user = (req as AuthenticatedRequest).user
            return user ? { userId: user.id } : {}
          },
          // Không ghi token, cookie, mật khẩu vào log
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
              '*.refreshToken',
            ],
            censor: '[đã ẩn]',
          },
          // Health check gọi liên tục: không ghi log mỗi lần
          autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
        },
      }),
    }),
  ],
})
export class ContextModule {}
