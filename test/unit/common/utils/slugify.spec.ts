import { slugify } from '@/common/utils/slugify'

describe('slugify (giống src/lib/slugify.ts của web)', () => {
  it.each([
    ['Ngôn Tình Đô Thị!', 'ngon-tinh-do-thi'],
    ['  Kiếm   hiệp  ', 'kiem-hiep'],
    ['ĐAM MỸ', 'dam-my'],
    ['Truyện 18+ (hay)', 'truyen-18-hay'],
    ['---', ''],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })
})
