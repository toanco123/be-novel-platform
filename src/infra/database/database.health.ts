import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { sql } from 'drizzle-orm'
import { withTimeout } from '@/common/utils/with-timeout'
import { DB, DB_HEALTH_TIMEOUT_MS } from './database.constants'
import type { Db } from './database.types'

/** DB trả lời `select 1` trong 2 giây thì coi là sống */
@Injectable()
export class DbHealthIndicator {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'database') {
    const indicator = this.health.check(key)
    try {
      await withTimeout(this.db.execute(sql`select 1`), DB_HEALTH_TIMEOUT_MS)
      return indicator.up()
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unknown' })
    }
  }
}
