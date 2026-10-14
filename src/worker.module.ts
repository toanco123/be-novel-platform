// Process worker: xử lý job trong hàng đợi (không mở cổng HTTP). Dùng chung cấu hình, log, DB,
// Redis với API; processor của từng hàng đợi khai báo ở đây.
import { Module } from '@nestjs/common'
import { AppConfigModule } from './config/app-config.module'
import { ContextModule } from './core/context/context.module'
import { DatabaseModule } from './infra/database/database.module'
import { QueueModule } from './infra/queue/queue.module'
import { SystemProcessor } from './infra/queue/system.processor'
import { RedisModule } from './infra/redis/redis.module'

@Module({
  imports: [AppConfigModule, ContextModule, DatabaseModule, RedisModule, QueueModule],
  providers: [SystemProcessor],
})
export class WorkerModule {}
