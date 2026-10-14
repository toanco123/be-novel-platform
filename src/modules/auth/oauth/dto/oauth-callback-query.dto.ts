import { IsOptional, IsString, MaxLength } from 'class-validator'

/** Query provider gửi về callback (tham số khác của provider bị bỏ) */
export class OAuthCallbackQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(256)
  state?: string

  /** Người dùng bấm hủy, provider báo lỗi */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string
}
