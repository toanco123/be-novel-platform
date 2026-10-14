import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'
import { WorkerModule } from './worker.module'

/** Dựng worker (dùng chung cho main của worker và test e2e) */
export async function createWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))
  // Nhận tín hiệu dừng: BullMQ đóng worker, chờ job đang chạy xong
  app.enableShutdownHooks()
  return app
}

async function main() {
  const app = await createWorker()
  app.get(Logger).log('Worker đã sẵn sàng')
}

if (require.main === module) void main()
