// Lưu ảnh trên S3-compatible (dev: RustFS, production: Cloudflare R2). Client upload thẳng lên S3
// bằng presigned PUT (không qua API); link ký kèm Content-Type và Content-Length nên client phải gửi
// đúng loại và kích thước đã khai.
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { AppConfig } from '@/config/app-config.service'
import { createS3Client } from './s3-client'
import { DELETE_BATCH_SIZE, PRESIGN_TTL_SECONDS } from './storage.constants'
import type { PresignedUpload, StoredObject, UploadRequest } from './storage.types'

@Injectable()
export class StorageService implements OnApplicationShutdown {
  private readonly s3: S3Client
  private readonly bucket: string

  constructor(private readonly config: AppConfig) {
    this.bucket = config.get('S3_BUCKET')
    this.s3 = createS3Client({
      endpoint: config.get('S3_ENDPOINT'),
      region: config.get('S3_REGION'),
      accessKeyId: config.get('S3_ACCESS_KEY_ID'),
      secretAccessKey: config.get('S3_SECRET_ACCESS_KEY'),
      bucket: this.bucket,
    })
  }

  /** Link upload 5 phút; service gọi sau khi đã kiểm tra loại, kích thước cho phép */
  async presignUpload({ key, contentType, size }: UploadRequest): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    })
    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGN_TTL_SECONDS,
      // Ký kèm hai header này: gửi sai loại hoặc sai kích thước thì S3 trả 403
      signableHeaders: new Set(['content-type', 'content-length']),
    })
    return {
      key,
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      publicUrl: this.publicUrl(key),
      expiresAt: new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000),
    }
  }

  publicUrl(key: string) {
    return `${this.config.get('S3_PUBLIC_URL').replace(/\/+$/, '')}/${key}`
  }

  /** File đã upload chưa (kèm kích thước, loại thật); chưa có → null */
  async head(key: string): Promise<StoredObject | null> {
    try {
      const head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? null }
    } catch (error) {
      if (error instanceof NotFound || (error as { name?: string }).name === 'NotFound') return null
      throw error
    }
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  /** Xóa mọi file có tiền tố này (vd `avatars/<userId>/` khi xóa tài khoản); trả số file đã xóa */
  async deletePrefix(prefix: string) {
    let deleted = 0
    let token: string | undefined
    do {
      const page = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: DELETE_BATCH_SIZE,
        }),
      )
      const keys = (page.Contents ?? []).flatMap((item) => (item.Key ? [{ Key: item.Key }] : []))
      if (keys.length > 0) {
        await this.s3.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }),
        )
        deleted += keys.length
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    return deleted
  }

  onApplicationShutdown() {
    this.s3.destroy()
  }
}
