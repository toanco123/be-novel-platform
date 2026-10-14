import { Module } from '@nestjs/common'
import { AppConfigModule } from './config/app-config'
import { ContextModule } from './core/context/context.module'
import { CoreModule } from './core/core.module'
import { DatabaseModule } from './infra/database/database.module'
import { HealthModule } from './modules/health/health.module'

@Module({
  imports: [AppConfigModule, ContextModule, CoreModule, DatabaseModule, HealthModule],
})
export class AppModule {}
