import type { Type } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { AppModule } from '@/app.module'
import { configureApp } from '@/bootstrap'
import type { ProviderOverride } from './helpers.types'

/**
 * App dựng giống production (configureApp) và đã init; nhớ `await app.close()` trong afterAll.
 * `overrides`: thay provider bằng bản giả (vd client Google trong test OAuth)
 */
export async function createTestApp(
  rootModule: Type = AppModule,
  overrides: ProviderOverride[] = [],
) {
  let builder = Test.createTestingModule({ imports: [rootModule] })
  for (const { provide, useValue } of overrides) {
    builder = builder.overrideProvider(provide).useValue(useValue)
  }
  const moduleRef = await builder.compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bufferLogs: true,
    bodyParser: false,
  })
  configureApp(app)
  await app.init()
  return app
}
