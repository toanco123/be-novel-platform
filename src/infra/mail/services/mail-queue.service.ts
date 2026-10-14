import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { MAIL_JOBS, QUEUES } from '@/infra/queue/queue.constants'
import type { MailMessage } from '../mail.types'

/** API đẩy email vào hàng đợi; worker gửi (request không phải chờ SMTP, lỗi thì tự thử lại) */
@Injectable()
export class MailQueueService {
  constructor(@InjectQueue(QUEUES.mail) private readonly queue: Queue<MailMessage>) {}

  async send(message: MailMessage) {
    await this.queue.add(MAIL_JOBS.send, message)
  }
}
