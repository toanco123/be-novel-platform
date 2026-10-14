import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { version } from '../../../package.json'
import { autoAuthorize } from './swagger-auto-authorize'

/** Tên security scheme bearer (khớp @ApiBearerAuth() mặc định) */
const BEARER = 'bearer'

const DESCRIPTION = `Backend của nền tảng đọc truyện chữ.

**Thử nhanh:** gọi \`POST /v1/auth/register\` hoặc \`/v1/auth/login\` → access token tự điền vào nút
**Authorize** (giữ lại khi tải lại trang) → gọi các route có ổ khóa. Hết hạn (15 phút) thì gọi
\`POST /v1/auth/refresh\` (cookie refresh token đã có sẵn trên trình duyệt).

**Response thành công** có dạng \`{ data, meta: { requestId } }\`.

**Tên trường:** body / query nhận cả camelCase lẫn snake_case (\`displayName\` hay \`display_name\`); response luôn camelCase.

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
