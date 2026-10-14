import { Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { QUEUES, SYSTEM_JOBS } from './queue.constants'

/** Xử lý hàng đợi `system` (chỉ chạy trong process worker) */
@Processor(QUEUES.system)
export class SystemProcessor extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case SYSTEM_JOBS.ping:
        return { pong: true, data: job.data as unknown, processedAt: new Date().toISOString() }
      default:
        throw new Error(`Job không xử lý được: ${job.name}`)
    }
  }
}
