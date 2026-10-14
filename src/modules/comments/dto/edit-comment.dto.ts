import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import { Trim } from '@/common/validation/decorators/transform.decorator'
import { MAX_COMMENT_LENGTH } from '../comments.constants'

/** Sửa nội dung bình luận của mình */
export class EditCommentDto {
  @ApiProperty({ minLength: 1, maxLength: MAX_COMMENT_LENGTH })
  @Trim()
  @IsString()
  @Length(1, MAX_COMMENT_LENGTH)
  content: string
}
