/**
 * "Ngôn Tình Đô Thị!" → "ngon-tinh-do-thi": bỏ dấu, `đ` → `d`, chữ thường, ký tự khác chữ / số thành
 * `-`. Giống hệt src/lib/slugify.ts của web (dùng cho đường dẫn và so trùng tên).
 */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
