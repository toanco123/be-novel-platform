// Chuẩn bị bucket cho dev và test (npm run storage:init, global-setup của e2e): tạo nếu chưa có, cho
// mọi người đọc file (ảnh công khai). Production (Cloudflare R2) tạo bucket trên trang của Cloudflare.
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3'
import { createS3Client } from './s3-client'
import type { S3Settings } from './storage.types'

export async function ensurePublicBucket(settings: S3Settings) {
  const s3 = createS3Client(settings)
  const { bucket } = settings
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    }),
  )
  s3.destroy()
}
