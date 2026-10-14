// Cấu hình log (nestjs-pino / pino-http): JSON một dòng ở production, dễ đọc ở dev; mỗi dòng có
// requestId và userId; không ghi token, cookie, mật khẩu.
import type { Params } from 'nestjs-pino'
import type { AppConfig } from '@/config/app-config.service'
import type { AuthenticatedRequest } from '../auth/auth.types'
import type { RequestWithId } from './context.types'

export function loggerOptions(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.get('LOG_LEVEL'),
      // Dev: log dễ đọc; production: JSON một dòng. Image Docker không có devDependency pino-pretty
      // nên chạy image với NODE_ENV=development (docker compose --profile app) vẫn ghi JSON
      transport:
        config.get('NODE_ENV') === 'development' && isInstalled('pino-pretty')
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
  }
}

/** Gói có cài trong node_modules không */
function isInstalled(name: string) {
  try {
    require.resolve(name)
    return true
  } catch {
    return false
  }
}
