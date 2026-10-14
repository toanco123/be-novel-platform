import { Global, Module } from '@nestjs/common'
import { MailQueueService } from './services/mail-queue.service'

/** API: MailQueueService đẩy email vào hàng đợi. Gửi thật (MailerService, MailProcessor) ở WorkerModule */
@Global()
@Module({ providers: [MailQueueService], exports: [MailQueueService] })
export class MailModule {}
