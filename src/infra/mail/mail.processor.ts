import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { ErrorLogger } from '@/common/errors/error-logger.service'
import { MAIL_JOBS, QUEUES } from '@/infra/queue/queue.constants'
import type { MailMessage } from './mail.types'
import { MailerService } from './services/mailer.service'

/** Xử lý hàng đợi `mail` (chỉ chạy trong process worker) */
@Processor(QUEUES.mail)
export class MailProcessor extends WorkerHost {
  constructor(
    private readonly mailer: MailerService,
    private readonly errors: ErrorLogger,
  ) {
    super()
  }

  async process(job: Job<MailMessage>) {
    if (job.name !== MAIL_JOBS.send) throw new Error(`Job không xử lý được: ${job.name}`)
    await this.mailer.send(job.data)
    return { sent: true }
  }

  /** Gửi lỗi (mỗi lần thử): ghi log, không ghi địa chỉ email */
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.errors.log(error, {
      queue: QUEUES.mail,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
    })
  }
}
