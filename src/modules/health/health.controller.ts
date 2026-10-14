import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common'
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { DbHealthIndicator } from '@/infra/database/db.health'

/** Health check cho load balancer / Docker; không có tiền tố phiên bản (/health/...) */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DbHealthIndicator,
  ) {}

  /** App còn chạy (không kiểm tra phụ thuộc): dùng cho liveness, không khởi động lại vì DB chậm */
  @Get('live')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live() {
    return { status: 'ok' as const }
  }

  /** Sẵn sàng nhận request: DB trả lời được (phần 3 thêm Redis) */
  @Get('ready')
  @HealthCheck()
  @ApiServiceUnavailableResponse({
    description: 'Một phụ thuộc không trả lời (code: service_unavailable)',
  })
  ready() {
    return this.health.check([() => this.db.check('database')])
  }
}
