import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import { Trim } from '@/common/validation/decorators/transform.decorator'

export class UpdateMeDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 30,
    example: 'Linh Nguyễn',
    description: 'Tên hiển thị, 2–30 ký tự sau khi bỏ khoảng trắng ở hai đầu',
  })
  @Trim()
  @IsString()
  @Length(2, 30)
  displayName: string
}
