import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator'
import { NormalizeEmail, Trim } from '@/core/http/transforms'
import { MeDto } from '@/modules/users/dto/me.dto'

export class RegisterDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string

  /** Giống form của web: 8–72 ký tự (72 là giới hạn của bcrypt) */
  @ApiProperty({ minLength: 8, maxLength: 72, example: 'mat-khau-bi-mat' })
  @IsString()
  @Length(8, 72)
  password!: string

  @ApiProperty({ minLength: 2, maxLength: 50, example: 'Linh' })
  @Trim()
  @IsString()
  @Length(2, 50)
  displayName!: string
}

export class LoginDto {
  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string

  /** Không bắt tối thiểu 8: user chuyển từ Supabase có thể có mật khẩu ngắn hơn */
  @ApiProperty({ minLength: 1, maxLength: 128, example: 'mat-khau-bi-mat' })
  @IsString()
  @Length(1, 128)
  password!: string
}

/** Body của /refresh và /logout: mobile gửi token ở đây, web để trống (dùng cookie) */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    maxLength: 256,
    description: 'Chỉ mobile gửi; web để trống, token nằm trong cookie refresh_token',
  })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  refreshToken?: string
}

export class AuthSessionDto {
  @ApiProperty({ type: MeDto })
  user!: MeDto

  @ApiProperty({
    description: 'JWT gửi kèm mọi request: Authorization: Bearer <accessToken>',
    example: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRldiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string

  @ApiProperty({ type: 'integer', description: 'Access token còn hiệu lực (giây)', example: 900 })
  expiresIn!: number

  @ApiPropertyOptional({
    description: 'Chỉ có khi gửi header X-Client: mobile; web nhận trong cookie HttpOnly',
  })
  refreshToken?: string
}
