// Đầu ra của route có @ResponseDto / @ResponsePage: lọc theo DTO (chỉ trường có @ApiField) rồi bọc
// { statusCode, data, meta }. Danh sách (Page<T>): data là mảng, meta có total, page, pageSize,
// pageCount. Route không gắn decorator (health, 204) giữ nguyên.
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Response } from 'express'
import { ClsService } from 'nestjs-cls'
import { map, type Observable } from 'rxjs'
import { pageMeta } from '../pagination/page'
import type { Page } from '../pagination/pagination.types'
import { RESPONSE_DTO } from './response.constants'
import type { ResponseEnvelope, ResponseShape } from './response.types'
import { serializeDto } from './serialize-dto'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shape = this.reflector.getAllAndOverride<ResponseShape | undefined>(RESPONSE_DTO, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!shape) return next.handle()
    const res = context.switchToHttp().getResponse<Response>()
    return next.handle().pipe(
      map((value): ResponseEnvelope<unknown> => {
        // Nest đặt status (mặc định hoặc @HttpCode) trước khi chạy interceptor
        const statusCode = res.statusCode
        const requestId = this.cls.getId()
        if (!shape.paginated) {
          return { statusCode, data: serializeDto(shape.dto, value), meta: { requestId } }
        }
        const page = value as Page<unknown>
        return {
          statusCode,
          data: serializeDto(shape.dto, page.items),
          meta: pageMeta(page, requestId),
        }
      }),
    )
  }
}
