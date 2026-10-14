/** Phần cần dùng của response trong Swagger UI (responseInterceptor) */
export type SwaggerResponse = { ok: boolean; url: string; obj?: { accessToken?: unknown } }

/** Phần cần dùng của đối tượng `window.ui` của Swagger UI */
export type SwaggerUi = {
  preauthorizeApiKey(name: string, value: string): void
  authActions: { persistAuthorizationIfNeeded(): void }
}
