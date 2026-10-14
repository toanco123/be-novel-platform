/** Một trang dữ liệu service trả về; ResponseInterceptor (@ResponsePage) bọc thành { data, meta } */
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

/** Vị trí của trang trong truy vấn (repository) */
export type PageWindow = { offset: number; limit: number }

/** `meta` của response danh sách */
export type PageMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
  requestId: string
}
