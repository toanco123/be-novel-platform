import { Inject, Logger, type OnApplicationShutdown } from '@nestjs/common'
import type postgres from 'postgres'
import { PG_CLIENT } from './database.constants'

/** Một pool cho cả process; đóng khi app tắt (enableShutdownHooks) */
export class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger('Database')

  constructor(@Inject(PG_CLIENT) private readonly sql: postgres.Sql) {}

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 })
    this.logger.log('Đã đóng pool Postgres')
  }
}
