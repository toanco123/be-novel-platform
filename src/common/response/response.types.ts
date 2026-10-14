export type ResponseDtoOptions = {
  /** HTTP status ghi trong Swagger (status thật do route quyết định, vd @HttpCode) */
  status?: 200 | 201
  description?: string
}

/** Thông tin kèm theo mọi response thành công */
export type ResponseMeta = { requestId: string }

/** Dạng chung của response thành công */
export type ResponseEnvelope<T> = { data: T; meta: ResponseMeta }
