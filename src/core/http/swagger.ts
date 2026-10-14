import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { version } from '../../../package.json'

/** Tên security scheme bearer (khớp @ApiBearerAuth() mặc định) */
const BEARER = 'bearer'

const DESCRIPTION = `Backend của nền tảng đọc truyện chữ.

**Thử nhanh:** gọi \`POST /v1/auth/register\` hoặc \`/v1/auth/login\` → access token tự điền vào nút
**Authorize** (giữ lại khi tải lại trang) → gọi các route có ổ khóa. Hết hạn (15 phút) thì gọi
\`POST /v1/auth/refresh\` (cookie refresh token đã có sẵn trên trình duyệt).

**Lỗi** luôn có dạng \`{ code, message, details?, requestId }\`; client hiển thị lời theo \`code\`.`

/** Tài liệu OpenAPI của app (schema lấy từ @ApiProperty của DTO) */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Novel Platform API')
    .setDescription(DESCRIPTION)
    .setVersion(version)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token' },
      BEARER,
    )
    .addTag('auth', 'Đăng ký, đăng nhập, refresh token, đăng xuất')
    .addTag('me', 'Tài khoản của người đang đăng nhập')
    .addTag('health', 'Kiểm tra app còn chạy (cho Docker / load balancer)')
    .build()
  return SwaggerModule.createDocument(app, config)
}

/**
 * Chạy trong trình duyệt (Swagger UI, hàm được chép nguyên văn vào trang): đăng ký / đăng nhập /
 * refresh thành công thì tự điền access token vào nút Authorize. Không dùng biến ngoài hàm.
 */
function autoAuthorize(res: { ok: boolean; url: string; obj?: { accessToken?: unknown } }) {
  type SwaggerUi = {
    preauthorizeApiKey(name: string, value: string): void
    authActions: { persistAuthorizationIfNeeded(): void }
  }
  try {
    const ui = (globalThis as { ui?: SwaggerUi }).ui
    const token = res.obj?.accessToken
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

/** /docs (giao diện) và /openapi.json */
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'openapi.json',
    customSiteTitle: 'Novel Platform API',
    swaggerOptions: {
      // Giữ access token khi tải lại trang
      persistAuthorization: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 0,
      responseInterceptor: autoAuthorize,
    },
  })
}
