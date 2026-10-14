import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token trong link xác nhận email (query `token`)', maxLength: 256 })
  @IsString()
  @Length(1, 256)
  token: string
}
