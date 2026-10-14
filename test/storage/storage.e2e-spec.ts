// StorageService trên RustFS thật (S3-compatible): presigned PUT, URL công khai, head, xóa
import { randomUUID } from 'node:crypto'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { StorageService } from '@/infra/storage/storage.service'
import { createTestApp } from '../helpers/app'

let app: NestExpressApplication
let storage: StorageService

beforeAll(async () => {
  app = await createTestApp()
  storage = app.get(StorageService)
})
afterAll(() => app.close())

/** "Ảnh" giả 1 KB */
const image = Buffer.alloc(1024, 7)
const keyIn = (prefix: string) => `${prefix}/${randomUUID()}.webp`

async function upload(key: string, body: Buffer = image, contentType = 'image/webp') {
  const presigned = await storage.presignUpload({
    key,
    contentType: 'image/webp',
    size: image.length,
  })
  return fetch(presigned.uploadUrl, {
    method: presigned.method,
    body,
    headers: { ...presigned.headers, 'Content-Type': contentType },
  })
}

it('presign → PUT đúng → URL công khai đọc được → head đúng kích thước, loại', async () => {
  const key = keyIn(`avatars/${randomUUID()}`)
  const presigned = await storage.presignUpload({
    key,
    contentType: 'image/webp',
    size: image.length,
  })
  expect(presigned).toMatchObject({
    key,
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    publicUrl: `${process.env.S3_PUBLIC_URL}/${key}`,
  })
  expect(presigned.expiresAt.getTime()).toBeGreaterThan(Date.now())
  expect(await storage.head(key)).toBeNull()

  expect((await upload(key)).status).toBe(200)
  const res = await fetch(presigned.publicUrl)
  expect(res.status).toBe(200)
  expect(Buffer.from(await res.arrayBuffer())).toEqual(image)
  expect(await storage.head(key)).toEqual({ size: 1024, contentType: 'image/webp' })
})

it('PUT sai loại hoặc sai kích thước đã khai → 403, file không được lưu', async () => {
  const key = keyIn('covers/test')
  expect((await upload(key, image, 'text/html')).status).toBe(403)
  expect((await upload(key, Buffer.alloc(2048, 1))).status).toBe(403)
  expect(await storage.head(key)).toBeNull()
})

it('delete xóa một file; deletePrefix xóa cả thư mục, không đụng thư mục khác', async () => {
  const owner = randomUUID()
  const [a, b] = [keyIn(`avatars/${owner}`), keyIn(`avatars/${owner}`)]
  const other = keyIn(`avatars/${randomUUID()}`)
  for (const key of [a, b, other]) expect((await upload(key)).status).toBe(200)

  await storage.delete(a)
  expect(await storage.head(a)).toBeNull()
  expect(await storage.deletePrefix(`avatars/${owner}/`)).toBe(1)
  expect(await storage.head(b)).toBeNull()
  expect(await storage.head(other)).not.toBeNull()
})
