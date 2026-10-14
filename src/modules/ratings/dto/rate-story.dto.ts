import { ApiProperty } from '@nestjs/swagger'
import { IsInt, Max, Min } from 'class-validator'
import { MAX_SCORE, MIN_SCORE } from '../ratings.constants'

/** Chấm điểm truyện */
export class RateStoryDto {
  @ApiProperty({ minimum: MIN_SCORE, maximum: MAX_SCORE, example: 5 })
  @IsInt()
  @Min(MIN_SCORE)
  @Max(MAX_SCORE)
  score: number
}
