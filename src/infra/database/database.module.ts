import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { AppConfig } from '@/config/app-config'
import { DB, PG_CLIENT } from './db'
import { DbHealthIndicator } from './db.health'
import * as schema from './schema'

/** Một pool cho cả process; đóng khi app tắt (enableShutdownHooks) */
class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger('Database')

  constructor(@Inject(PG_CLIENT) private readonly sql: postgres.Sql) {}

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 })
    this.logger.log('Đã đóng pool Postgres')
  }
}

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: PG_CLIENT,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        postgres(config.get('DATABASE_URL'), {
          max: config.get('DB_POOL_MAX'),
          idle_timeout: 20,
          max_lifetime: 30 * 60,
          connection: {
            application_name: 'novel-api',
            statement_timeout: config.get('DB_STATEMENT_TIMEOUT_MS'),
          },
          // Thông báo NOTICE của Postgres (vd "extension đã có") không cần ghi log
          onnotice: () => {},
        }),
    },
    {
      provide: DB,
      inject: [PG_CLIENT],
      useFactory: (sql: postgres.Sql) => drizzle(sql, { schema, casing: 'snake_case' }),
    },
    DatabaseLifecycle,
    DbHealthIndicator,
  ],
  exports: [DB, DbHealthIndicator],
})
export class DatabaseModule {}
