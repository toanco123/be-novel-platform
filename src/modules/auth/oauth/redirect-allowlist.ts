// redirect_to sau đăng nhập mạng xã hội chỉ được trỏ về web hoặc deep link của app đã khai báo
// (chống open redirect: kẻ xấu đưa link đăng nhập trả mã về trang của họ).

/** Đường dẫn của mẫu kết thúc bằng `/` để `/auth` không khớp `/authx` */
const withSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`)

/**
 * URL được phép khi cùng scheme, cùng host (kể cả cổng) và đường dẫn nằm dưới đường dẫn của một mẫu.
 * Mẫu deep link không có host (vd `webtruyen://`) cho mọi đường dẫn của scheme đó.
 */
export function isAllowedRedirect(target: string, allowed: string[]) {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return false
  }
  if (url.username || url.password) return false
  return allowed.some((pattern) => {
    let base: URL
    try {
      base = new URL(pattern)
    } catch {
      return false
    }
    if (url.protocol !== base.protocol) return false
    const isWeb = base.protocol === 'http:' || base.protocol === 'https:'
    if (!isWeb && !base.host) return true
    if (url.host !== base.host) return false
    return (
      base.pathname === '/' ||
      url.pathname === base.pathname ||
      url.pathname.startsWith(withSlash(base.pathname))
    )
  })
}
