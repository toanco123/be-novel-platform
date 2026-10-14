// Đường đi của job: API đẩy vào hàng đợi (Redis) → process worker xử lý
import { getQueueToken } from '@nestjs/bullmq'
import type { INestApplicationContext } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { Queue } from 'bullmq'
import { QUEUES, SYSTEM_JOBS } from '@/infra/queue/queues'
import { createWorker } from '@/worker'
import { createTestApp } from '../helpers/app'

let api: NestExpressApplication
let worker: INestApplicationContext

beforeAll(async () => {
  api = await createTestApp()
  worker = await createWorker()
  await worker.init()
})
afterAll(async () => {
  await worker.close()
  await api.close()
})

test('API đẩy job ping, worker xử lý xong và trả kết quả', async () => {
  const queue = api.get<Queue>(getQueueToken(QUEUES.system))
  const job = await queue.add(SYSTEM_JOBS.ping, { hello: 'worker' })
  await expect
    .poll(async () => (await queue.getJob(job.id!))?.returnvalue, { timeout: 15_000 })
    .toMatchObject({ pong: true, data: { hello: 'worker' } })
  expect(await (await queue.getJob(job.id!))?.getState()).toBe('completed')
})
