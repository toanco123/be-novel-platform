import { Module } from '@nestjs/common'
import { AppConfigModule } from './config/app-config'
import { ContextModule } from './core/context/context.module'
import { CoreModule } from './core/core.module'
import { HealthModule } from './modules/health/health.module'

@Module({
  imports: [AppConfigModule, ContextModule, CoreModule, HealthModule],
})
export class AppModule {}
