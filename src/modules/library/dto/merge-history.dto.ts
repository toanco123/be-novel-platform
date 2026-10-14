import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator'
import { HISTORY_LIMIT } from '../library.constants'
import { MergeHistoryEntryDto } from './merge-history-entry.dto'

/** Lịch sử lúc còn là khách, gửi lên sau khi đăng nhập */
export class MergeHistoryDto {
  @ApiProperty({ type: [MergeHistoryEntryDto], maxItems: HISTORY_LIMIT })
  @IsArray()
  @ArrayMaxSize(HISTORY_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => MergeHistoryEntryDto)
  entries: MergeHistoryEntryDto[]
}
