// Ghi openapi.json ra thư mục gốc repo (commit kèm code) để web và mobile sinh client có kiểu.
// Chạy: npm run openapi:export (build trước rồi chạy bản dist).
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildOpenApiDocument } from '@/common/swagger/swagger'
import { createApp } from '../bootstrap'

async function main() {
  const app = await createApp()
  await app.init()
  const document = buildOpenApiDocument(app)
  const file = join(process.cwd(), 'openapi.json')
  writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`)
  await app.close()
  process.stdout.write(`Đã ghi ${file}\n`)
}

void main()
