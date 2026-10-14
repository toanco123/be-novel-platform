import { ApiField } from './decorators/api-field.decorator'

/** `meta` của response thành công (Swagger) */
export class ResponseMetaDto {
  @ApiField({
    description: 'Id của request (trùng header x-request-id), gửi kèm khi báo lỗi',
    example: '0b8e7f7e-2d51-4d1a-a1f3-5f0f6a8c9d22',
  })
  requestId: string
}
