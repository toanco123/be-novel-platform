// openapi.json trong repo (web, mobile sinh client từ file này) phải khớp code: đổi API mà quên
// `npm run openapi:export` thì test báo lỗi (CI chạy test này)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { OpenAPIObject } from '@nestjs/swagger'
import { buildOpenApiDocument } from '@/common/swagger/swagger'
import { createTestApp } from './helpers/app'

let app: NestExpressApplication

beforeAll(async () => {
  app = await createTestApp()
})
afterAll(() => app.close())

/** Bỏ version (đổi mỗi commit) để chỉ so nội dung API */
const withoutVersion = (doc: OpenAPIObject) => ({ ...doc, info: { ...doc.info, version: '' } })

test('openapi.json trong repo khớp API hiện tại (lệch thì chạy npm run openapi:export)', () => {
  const committed = JSON.parse(
    readFileSync(join(process.cwd(), 'openapi.json'), 'utf8'),
  ) as OpenAPIObject
  const current = JSON.parse(JSON.stringify(buildOpenApiDocument(app))) as OpenAPIObject
  expect(withoutVersion(committed)).toEqual(withoutVersion(current))
})
