import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Chương hẹn giờ sớm nhất: người đọc chỉ thấy số chương và giờ ra */
export class NextChapterDto {
  @ApiField({ example: 13 })
  number: number

  @ApiField({ format: 'date-time', description: 'Giờ tự xuất bản' })
  at: string
}
