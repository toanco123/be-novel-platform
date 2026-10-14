import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { sql } from 'drizzle-orm'
import { DB, type Db } from './db'

const TIMEOUT_MS = 2000

/** DB trả lời `select 1` trong 2 giây thì coi là sống */
@Injectable()
export class DbHealthIndicator {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly health: HealthIndicatorService,
  ) {}

  async check(key = 'database') {
    const indicator = this.health.check(key)
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.db.execute(sql`select 1`),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
        }),
      ])
      return indicator.up()
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unknown' })
    } finally {
      clearTimeout(timer)
    }
  }
}
