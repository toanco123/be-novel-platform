import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsIn, IsString, Length, MaxLength } from 'class-validator'
import { NormalizeEmail, Trim } from '@/common/validation/decorators/transform.decorator'
import type { ContactTopic } from '@/infra/database/schema'
import { CONTACT_TOPICS } from '../feedback.constants'

/** Tin nhắn liên hệ (khách cũng gửi được) */
export class ContactMessageDto {
  @ApiProperty({ minLength: 2, maxLength: 60, example: 'Linh' })
  @Trim()
  @IsString()
  @Length(2, 60)
  name: string

  @ApiProperty({ format: 'email', maxLength: 254, example: 'linh@example.com' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email: string

  @ApiProperty({ enum: CONTACT_TOPICS })
  @IsIn(CONTACT_TOPICS)
  topic: ContactTopic

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @Trim()
  @IsString()
  @Length(10, 2000)
  message: string
}
