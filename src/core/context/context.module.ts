// Ngữ cảnh theo request (nestjs-cls) và log (nestjs-pino). CLS giữ requestId để mọi nơi đọc được
// (filter lỗi, service), không phải truyền tay; JwtAuthGuard thêm actor (người đang gọi API).
import { Global, Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { LoggerModule } from 'nestjs-pino'
import { AppConfig } from '@/config/app-config.service'
import type { RequestWithId } from './context.types'
import { loggerOptions } from './logger.options'

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
    LoggerModule.forRootAsync({ inject: [AppConfig], useFactory: loggerOptions }),
  ],
})
export class ContextModule {}
