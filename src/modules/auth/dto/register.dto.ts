import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, MaxLength } from 'class-validator'
import { NormalizeEmail, Trim } from '@/common/validation/transform.decorator'

export class RegisterDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string

  /** Giống form của web: 8–72 ký tự (72 là giới hạn của bcrypt) */
  @ApiProperty({ minLength: 8, maxLength: 72, example: 'mat-khau-bi-mat' })
  @IsString()
  @Length(8, 72)
  password: string

  @ApiProperty({ minLength: 2, maxLength: 50, example: 'Linh' })
  @Trim()
  @IsString()
  @Length(2, 50)
  displayName: string
}
