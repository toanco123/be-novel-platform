const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Chèn chuỗi người dùng nhập (tên hiển thị...) vào HTML (email) */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ENTITIES[char]!)
