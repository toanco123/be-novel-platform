// Chuẩn hóa giá trị trước khi validate (class-transformer, chạy trong ValidationPipe).
// Giá trị không phải chuỗi để nguyên cho validator báo lỗi kiểu.
import { Transform } from 'class-transformer'

/** Bỏ khoảng trắng ở hai đầu */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))

/** Email: bỏ khoảng trắng, chữ thường (email lưu dạng citext, so sánh không phân biệt hoa thường) */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
