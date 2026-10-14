import { Global, Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { AppConfig } from '@/config/app-config.service'
import { DB, PG_CLIENT } from './database.constants'
import { DbHealthIndicator } from './database.health'
import { DatabaseLifecycle } from './database.lifecycle'
import * as schema from './schema'

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
