import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'
import { DEFAULT_RELATED_LIMIT, MAX_RELATED_LIMIT } from '../stories.constants'

/** Query truyện liên quan */
export class RelatedQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_RELATED_LIMIT, default: DEFAULT_RELATED_LIMIT })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RELATED_LIMIT)
  limit: number = DEFAULT_RELATED_LIMIT
}
