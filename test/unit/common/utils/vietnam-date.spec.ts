import { vietnamDate } from '@/common/utils/vietnam-date'

describe('vietnamDate', () => {
  it('ngày theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD', () => {
    expect(vietnamDate(new Date('2026-10-14T10:00:00Z'))).toBe('2026-10-14')
    // 23:30 UTC là 6:30 sáng hôm sau ở Việt Nam
    expect(vietnamDate(new Date('2026-10-14T23:30:00Z'))).toBe('2026-10-15')
    expect(vietnamDate(new Date('2026-12-31T16:59:59Z'))).toBe('2026-12-31')
    expect(vietnamDate(new Date('2026-12-31T17:00:00Z'))).toBe('2027-01-01')
  })
})
