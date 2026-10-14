import { S3Client } from '@aws-sdk/client-s3'
import type { S3Settings } from './storage.types'

/** Client S3 dạng path-style (`<endpoint>/<bucket>/<key>`): chạy được với RustFS (dev) và R2 */
export const createS3Client = ({ endpoint, region, accessKeyId, secretAccessKey }: S3Settings) =>
  new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })
