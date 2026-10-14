import type { Type } from '@nestjs/common'
import { AppModule } from '@/app.module'
import { createApp } from '@/bootstrap'

/** App dựng giống production (createApp) và đã init; nhớ `await app.close()` trong afterAll */
export async function createTestApp(rootModule: Type = AppModule) {
  const app = await createApp(rootModule)
  await app.init()
  return app
}
