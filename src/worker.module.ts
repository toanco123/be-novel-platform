// Process worker: xử lý job trong hàng đợi (không mở cổng HTTP). Dùng chung cấu hình, log, DB,
// Redis với API; processor của từng hàng đợi khai báo ở đây.
import { Module } from '@nestjs/common'
import { ContextModule } from './common/context/context.module'
import { ErrorsModule } from './common/errors/errors.module'
import { AppConfigModule } from './config/app-config.module'
import { DatabaseModule } from './infra/database/database.module'
import { MailProcessor } from './infra/mail/mail.processor'
import { MailerService } from './infra/mail/services/mailer.service'
import { QueueModule } from './infra/queue/queue.module'
import { SystemProcessor } from './infra/queue/system.processor'
import { RedisModule } from './infra/redis/redis.module'

@Module({
  imports: [AppConfigModule, ContextModule, ErrorsModule, DatabaseModule, RedisModule, QueueModule],
  providers: [SystemProcessor, MailerService, MailProcessor],
})
export class WorkerModule {}
