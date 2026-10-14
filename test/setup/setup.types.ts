// Kiểu của giá trị global-setup.ts đưa cho các file test (project.provide / inject)
export type { ProvidedContext } from 'vitest'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
    redisUrl: string
    smtpUrl: string
    /** API của Mailpit (đọc thư app gửi) */
    mailpitUrl: string
    /** RustFS (S3) */
    s3Endpoint: string
  }
}
