import type { Type } from '@nestjs/common'

export type ResponseDtoOptions = {
  /** HTTP status ghi trong Swagger (status thật do route quyết định, vd @HttpCode) */
  status?: 200 | 201
  description?: string
  /** Service trả mảng (không phân trang): data là mảng các `dto` */
  isArray?: boolean
  /** Service có thể trả null (vd chưa có dữ liệu): data là `dto` hoặc null */
  nullable?: boolean
}

/** Thông tin kèm theo mọi response thành công */
export type ResponseMeta = { requestId: string }

/** Dạng chung của response thành công; statusCode trùng HTTP status */
export type ResponseEnvelope<T> = { statusCode: number; data: T; meta: ResponseMeta }

/** Metadata @ResponseDto / @ResponsePage gắn lên route */
export type ResponseShape = { dto: Type; paginated: boolean }
