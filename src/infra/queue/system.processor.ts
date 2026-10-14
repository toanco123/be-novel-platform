import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { ErrorLogger } from '@/common/errors/error-logger.service'
import { QUEUES, SYSTEM_JOBS } from './queue.constants'

/** Xử lý hàng đợi `system` (chỉ chạy trong process worker) */
@Processor(QUEUES.system)
export class SystemProcessor extends WorkerHost {
  constructor(private readonly errors: ErrorLogger) {
    super()
  }

  async process(job: Job) {
    switch (job.name) {
      case SYSTEM_JOBS.ping:
        return { pong: true, data: job.data as unknown, processedAt: new Date().toISOString() }
      default:
        throw new Error(`Job không xử lý được: ${job.name}`)
    }
  }

  /** Job lỗi (mỗi lần thử): ghi log cùng cấu trúc với lỗi của API */
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.errors.log(error, {
      queue: QUEUES.system,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
    })
  }
}
