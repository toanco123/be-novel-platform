import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { ClsService } from 'nestjs-cls'
import { toApiError } from './to-api-error'

/**
 * Mọi lỗi (của service, validate, Nest, body-parser, lỗi lạ) đều trả cùng một dạng:
 * { code, message, details?, requestId }. Lỗi 5xx ghi log đầy đủ nhưng không lộ chi tiết ra ngoài.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions')

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const error = toApiError(exception)
    if (error.status >= 500) this.logger.error(exception)

    res.status(error.status).json({
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId: this.cls.getId(),
    })
  }
}
