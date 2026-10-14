import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'
import { HISTORY_LIMIT } from '../library.constants'

/** Query lịch sử đọc */
export class HistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: HISTORY_LIMIT, default: HISTORY_LIMIT })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HISTORY_LIMIT)
  limit: number = HISTORY_LIMIT
}
