// Tạo bucket lưu ảnh (nếu chưa có) và cho đọc công khai: npm run storage:init (dev, RustFS của
// docker-compose). Production (Cloudflare R2) tạo bucket trên trang của Cloudflare.
import { existsSync } from 'node:fs'
import { validateEnv } from '@/config/validate-env'
import { ensurePublicBucket } from '@/infra/storage/storage-setup'

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const env = validateEnv(process.env)
  await ensurePublicBucket({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    bucket: env.S3_BUCKET,
  })
  process.stdout.write(`Bucket ${env.S3_BUCKET} đã sẵn sàng\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Tạo bucket lỗi: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
})
