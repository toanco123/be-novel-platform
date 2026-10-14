// Ghi log lỗi theo một cấu trúc chung, dùng cho mọi nơi: filter của API, worker (job lỗi), service
// khi bắt lỗi rồi xử lý tiếp. Mỗi dòng log:
// { error: { code, status, message, details? }, err (stack, chỉ với lỗi ngoài dự kiến),
//   requestId, userId (khi đang trong request), ...context }
import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { PinoLogger } from 'nestjs-pino'
import type { Actor } from '../auth/auth.types'
import { AppException } from './app.exception'
import type { ErrorLogContext } from './errors.types'
import { toApiError } from './to-api-error'

@Injectable()
export class ErrorLogger {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService,
  ) {
    logger.setContext('Errors')
  }

  /**
   * Lỗi 5xx ghi mức error, lỗi khác mức warn. AppException 4xx là lỗi đã biết nên không kèm stack;
   * lỗi ngoài dự kiến kèm `err` (tên, thông điệp gốc, stack)
   */
  log(error: unknown, context: ErrorLogContext = {}) {
    const { status, code, message, details } = toApiError(error)
    const expected = error instanceof AppException && status < 500
    const entry = {
      error: { code, status, message, ...(details ? { details } : {}) },
      ...(expected ? {} : { err: error }),
      ...this.requestContext(),
      ...context,
    }
    const text = !expected && error instanceof Error ? error.message : message
    if (status >= 500) this.logger.error(entry, text)
    else this.logger.warn(entry, text)
  }

  /** requestId, userId của request đang chạy; ngoài request (worker) thì không có */
  private requestContext() {
    if (!this.cls.isActive()) return {}
    const actor = this.cls.get<Actor | undefined>('actor')
    return { requestId: this.cls.getId(), ...(actor ? { userId: actor.id } : {}) }
  }
}
