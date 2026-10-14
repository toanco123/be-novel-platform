import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Length, MaxLength } from 'class-validator'
import { Trim } from '@/common/validation/decorators/transform.decorator'

export class CreateGenreDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 30,
    example: 'Ngôn tình',
    description:
      'Bỏ khoảng trắng thừa, viết hoa chữ đầu; trùng (không phân biệt dấu, hoa thường) thì 409',
  })
  @Trim()
  @IsString()
  @Length(2, 30)
  name: string

  @ApiPropertyOptional({ maxLength: 200, example: 'Truyện tình cảm' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  description?: string
}
