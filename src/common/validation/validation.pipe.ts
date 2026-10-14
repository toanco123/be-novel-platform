// Validate body / query bằng class-validator: DTO là class có decorator (@IsEmail, @Length...).
// Body / query nhận cả camelCase lẫn snake_case: đổi về camelCase trước khi validate. Lỗi thành
// 400 validation_failed (errors/validation-exception.factory.ts).
import { type ArgumentMetadata, Injectable, ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from '../errors/validation-exception.factory'
import { camelCaseKeys } from '../utils/case-keys'

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      // Bỏ các trường không khai báo trong DTO
      whitelist: true,
      // Trả instance của DTO (chạy @Transform: trim, chữ thường...)
      transform: true,
      // Không tự đổi kiểu theo kiểu TypeScript ("1" → 1): DTO tự khai báo @Type / @Transform khi cần
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
      exceptionFactory: validationExceptionFactory,
    })
  }

  override transform(value: unknown, metadata: ArgumentMetadata) {
    const input =
      metadata.type === 'body' || metadata.type === 'query' ? camelCaseKeys(value) : value
    return super.transform(input, metadata)
  }
}
