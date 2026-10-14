import { HealthIndicatorService } from '@nestjs/terminus'
import type { Db } from '@/infra/database/database.types'
import { DbHealthIndicator } from '@/infra/database/database.health'

const indicator = (execute: () => Promise<unknown>) =>
  new DbHealthIndicator({ execute } as unknown as Db, new HealthIndicatorService())

test('DB trả lời: up', async () => {
  expect(await indicator(async () => []).check()).toEqual({ database: { status: 'up' } })
})

test('DB lỗi: down kèm lý do', async () => {
  const result = await indicator(async () => {
    throw new Error('connect ECONNREFUSED')
  }).check()
  expect(result).toEqual({ database: { status: 'down', message: 'connect ECONNREFUSED' } })
})
