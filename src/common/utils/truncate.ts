/**
 * Cắt còn tối đa `max` ký tự, đếm theo ký tự thật (code point) như char_length của Postgres: không
 * cắt đôi emoji hay ký tự ngoài BMP
 */
export function truncateChars(text: string, max: number) {
  const chars = Array.from(text)
  return chars.length > max ? chars.slice(0, max).join('') : text
}
