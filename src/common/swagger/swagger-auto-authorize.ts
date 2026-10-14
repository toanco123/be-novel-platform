import type { SwaggerResponse, SwaggerUi } from './swagger.types'

/**
 * Chạy trong trình duyệt (Swagger UI chép nguyên văn hàm này vào trang, nên không dùng biến ngoài
 * hàm): register / login / refresh thành công thì tự điền access token vào nút Authorize và lưu lại.
 */
export function autoAuthorize(res: SwaggerResponse) {
  try {
    const ui = (globalThis as { ui?: SwaggerUi }).ui
    const token = res.obj?.data?.accessToken
    if (
      ui &&
      res.ok &&
      typeof token === 'string' &&
      /\/v1\/auth\/(register|login|refresh)$/.test(new URL(res.url).pathname)
    ) {
      ui.preauthorizeApiKey('bearer', token)
      // preauthorize không tự lưu như nút Authorize: lưu để tải lại trang vẫn còn
      ui.authActions.persistAuthorizationIfNeeded()
    }
  } catch {
    // Không làm hỏng response của Swagger UI
  }
  return res
}
