import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, Max, Min } from 'class-validator'
import {
  DEFAULT_RANKING_LIMIT,
  MAX_RANKING_LIMIT,
  RANKING_CRITERIA,
  RANKING_PERIODS,
} from '../stories.constants'
import type { RankingCriterion, RankingPeriod } from '../stories.types'

/** Query bảng xếp hạng */
export class RankingQueryDto {
  @ApiPropertyOptional({
    enum: RANKING_CRITERIA,
    default: 'views',
    description: 'views: lượt đọc; rating: điểm (có trọng số); follows: người theo dõi',
  })
  @IsIn(RANKING_CRITERIA)
  by: RankingCriterion = 'views'

  @ApiPropertyOptional({
    enum: RANKING_PERIODS,
    default: 'week',
    description: 'Chỉ áp dụng cho lượt đọc: 7 / 30 ngày gần nhất (giờ Việt Nam) hoặc tất cả',
  })
  @IsIn(RANKING_PERIODS)
  period: RankingPeriod = 'week'

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_RANKING_LIMIT, default: DEFAULT_RANKING_LIMIT })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RANKING_LIMIT)
  limit: number = DEFAULT_RANKING_LIMIT
}
