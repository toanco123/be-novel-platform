import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

/** Health check cho load balancer / Docker; không có tiền tố phiên bản (/health/...) */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  /** App còn chạy (không kiểm tra DB, Redis: xem /health/ready từ phần 2) */
  @Get('live')
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live() {
    return { status: 'ok' as const }
  }
}
