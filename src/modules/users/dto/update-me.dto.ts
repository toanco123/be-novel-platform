import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import { Trim } from '@/common/validation/transform.decorator'

export class UpdateMeDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 50,
    example: 'Linh Nguyễn',
    description: 'Tên hiển thị, 2–50 ký tự sau khi bỏ khoảng trắng ở hai đầu',
  })
  @Trim()
  @IsString()
  @Length(2, 50)
  displayName: string
}
