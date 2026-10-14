import { normalizeGenreName } from '@/modules/genres/genre-name'

describe('normalizeGenreName (giống web)', () => {
  it('bỏ khoảng trắng thừa, viết hoa chữ đầu, slug không dấu', () => {
    expect(normalizeGenreName('  ngôn   tình ')).toEqual({ name: 'Ngôn tình', slug: 'ngon-tinh' })
    expect(normalizeGenreName('đô thị')).toEqual({ name: 'Đô thị', slug: 'do-thi' })
  })

  it('tên chỉ có ký tự đặc biệt → slug rỗng', () => {
    expect(normalizeGenreName('!!!').slug).toBe('')
  })
})
