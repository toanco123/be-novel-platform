// Thành phần dùng chung toàn app: filter lỗi, pipe validate đầu vào, interceptor lọc đầu ra
import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AllExceptionsFilter } from './errors/all-exceptions.filter'
import { AppValidationPipe } from './validation/validation.pipe'

@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useClass: AppValidationPipe },
    // Route có @ResponseDto chỉ trả các trường có @ApiField
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class CommonModule {}
