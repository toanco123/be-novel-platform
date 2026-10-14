import type { Page, PageMeta, PageWindow } from './pagination.types'

/** Trang thứ `page` (từ 1), `pageSize` dòng mỗi trang → offset / limit cho truy vấn */
export const pageWindow = ({ page, pageSize }: { page: number; pageSize: number }): PageWindow => ({
  offset: (page - 1) * pageSize,
  limit: pageSize,
})

/** `meta` của response danh sách (không có dòng nào thì pageCount = 0) */
export const pageMeta = (page: Page<unknown>, requestId: string): PageMeta => ({
  total: page.total,
  page: page.page,
  pageSize: page.pageSize,
  pageCount: Math.ceil(page.total / page.pageSize),
  requestId,
})
