/** File client sắp upload (service kiểm tra loại, kích thước theo chức năng trước khi xin link) */
export type UploadRequest = {
  /** Đường dẫn trong bucket, vd `avatars/<userId>/<uuid>.webp` */
  key: string
  contentType: string
  /** Số byte; client phải gửi đúng bằng này */
  size: number
}

/** Link upload trả cho client: PUT `uploadUrl` với đúng `headers` */
export type PresignedUpload = {
  key: string
  uploadUrl: string
  method: 'PUT'
  headers: { 'Content-Type': string }
  /** URL công khai của file sau khi upload xong */
  publicUrl: string
  expiresAt: Date
}

/** Thông tin file đã có trong bucket */
export type StoredObject = { size: number; contentType: string | null }

/** Cấu hình nối S3 (dùng chung cho app và script storage:init) */
export type S3Settings = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}
