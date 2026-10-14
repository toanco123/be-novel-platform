import { BullModule } from '@nestjs/bullmq'
import { Global, Module } from '@nestjs/common'
import { AppConfig } from '@/config/app-config.service'
import { QUEUES } from './queue.constants'

/**
 * Kết nối BullMQ (Redis riêng của BullMQ, không dùng chung client REDIS vì worker cần
 * maxRetriesPerRequest = null). Mặc định: thử lại 3 lần, backoff mũ, dọn job cũ.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        connection: { url: config.get('REDIS_URL'), maxRetriesPerRequest: null },
        prefix: 'novel',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUES.system }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
