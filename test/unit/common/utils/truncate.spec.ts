import { truncateChars } from '@/common/utils/truncate'

describe('truncateChars', () => {
  it('ngắn hơn giới hạn thì giữ nguyên', () => {
    expect(truncateChars('Chương một', 120)).toBe('Chương một')
  })

  it('cắt theo ký tự thật, không cắt đôi emoji', () => {
    expect(truncateChars('ab😀cd', 3)).toBe('ab😀')
    expect(truncateChars('😀'.repeat(5), 2)).toBe('😀😀')
  })
})
