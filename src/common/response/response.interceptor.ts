// Đầu ra của route có @ResponseDto: lọc theo DTO (chỉ trường có @ApiField) rồi bọc
// { data, meta: { requestId } }. Route không có @ResponseDto (health, 204) giữ nguyên.
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  type Type,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ClsService } from 'nestjs-cls'
import { map, type Observable } from 'rxjs'
import { RESPONSE_DTO } from './response.constants'
import type { ResponseEnvelope } from './response.types'
import { serializeDto } from './serialize-dto'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const dto = this.reflector.getAllAndOverride<Type | undefined>(RESPONSE_DTO, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!dto) return next.handle()
    return next.handle().pipe(
      map((value): ResponseEnvelope<unknown> => ({
        data: serializeDto(dto, value),
        meta: { requestId: this.cls.getId() },
      })),
    )
  }
}
