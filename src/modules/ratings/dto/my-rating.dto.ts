import { ApiField } from '@/common/response/decorators/api-field.decorator'

/** Điểm người gọi đã chấm cho truyện */
export class MyRatingDto {
  @ApiField({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 5,
    description: 'null: chưa chấm',
  })
  score: number | null
}
