import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common'
import type { Response } from 'express'
import { ClsService } from 'nestjs-cls'
import { ErrorLogger } from './error-logger.service'
import { toApiError } from './to-api-error'
import { toErrorResponse } from './to-error-response'

/**
 * Mọi lỗi (của service, validate, Nest, body-parser, lỗi lạ) đều trả cùng một dạng:
 * { statusCode, error: { code, message, details? }, meta: { requestId } }. Lỗi 5xx ghi log đầy đủ (ErrorLogger) nhưng không lộ chi
 * tiết ra ngoài; lỗi 4xx do client, log request của pino-http đã có status.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly cls: ClsService,
    private readonly errors: ErrorLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const error = toApiError(exception)
    if (error.status >= 500) this.errors.log(exception)
    res.status(error.status).json(toErrorResponse(error, this.cls.getId()))
  }
}
