import { authorSlug } from '@/modules/stories/author-slug'

const OWNER = '6f1c2d4e-0b7a-4c1e-9a55-2f3e8d9b1a20'

describe('authorSlug', () => {
  it('không bút danh: tac-gia-<ownerId>', () => {
    expect(authorSlug(OWNER, null)).toBe(`tac-gia-${OWNER}`)
  })

  it('có bút danh: thêm slug của bút danh (giống authorSlug của web)', () => {
    expect(authorSlug(OWNER, 'Mặc Hương Đồng Khứu')).toBe(`tac-gia-${OWNER}-mac-huong-dong-khuu`)
  })

  it('bút danh chỉ có ký tự đặc biệt (slug rỗng) coi như không có', () => {
    expect(authorSlug(OWNER, '***')).toBe(`tac-gia-${OWNER}`)
  })
})
