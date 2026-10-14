// Đổi tên khóa snake_case → camelCase (body / query client gửi lên), đệ quy vào object con và mảng.

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/
/** Khóa có thể đổi prototype khi gán: bỏ hẳn */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

/** display_name → displayName; khóa không phải snake_case giữ nguyên */
export const toCamelCase = (key: string) =>
  SNAKE_CASE.test(key) ? key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase()) : key

/** Mọi khóa snake_case thành camelCase; trùng (`displayName` và `display_name`) thì camelCase thắng */
export function camelCaseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelCaseKeys)
  if (!isPlainObject(value)) return value
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (UNSAFE_KEYS.has(key)) continue
    const camel = toCamelCase(key)
    // Khóa đã là camelCase luôn được ghi; khóa đổi từ snake_case chỉ ghi khi chưa có
    if (camel === key || !Object.hasOwn(value, camel)) result[camel] = camelCaseKeys(item)
  }
  return result
}
