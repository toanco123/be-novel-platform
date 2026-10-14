import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Người báo lỗi */
export class ReportReporterDto {
  @ApiField({ format: 'uuid' })
  id: string

  @ApiField({ example: 'Linh' })
  displayName: string
}
