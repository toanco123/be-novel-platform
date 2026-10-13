import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import { version } from '../../../package.json'

/** Tài liệu OpenAPI của app (DTO zod → schema qua nestjs-zod) */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Novel Platform API')
    .setDescription(
      'Backend của nền tảng đọc truyện chữ. Lỗi luôn có dạng { code, message, details?, requestId }.',
    )
    .setVersion(version)
    .addBearerAuth()
    .build()
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config))
}

/** /docs (giao diện) và /openapi.json */
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'openapi.json',
  })
}
