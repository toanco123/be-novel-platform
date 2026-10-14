import { pageMeta, pageWindow } from '@/common/pagination/page'

describe('phân trang', () => {
  it('trang → offset / limit', () => {
    expect(pageWindow({ page: 1, pageSize: 20 })).toEqual({ offset: 0, limit: 20 })
    expect(pageWindow({ page: 3, pageSize: 10 })).toEqual({ offset: 20, limit: 10 })
  })

  it('meta: số trang làm tròn lên, không có dòng nào thì 0 trang', () => {
    expect(pageMeta({ items: [], total: 41, page: 2, pageSize: 20 }, 'r')).toEqual({
      total: 41,
      page: 2,
      pageSize: 20,
      pageCount: 3,
      requestId: 'r',
    })
    expect(pageMeta({ items: [], total: 0, page: 1, pageSize: 20 }, 'r').pageCount).toBe(0)
  })
})
