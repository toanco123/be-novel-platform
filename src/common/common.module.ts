// Thành phần dùng chung toàn app: filter lỗi, pipe validate đầu vào, interceptor lọc và bọc đầu ra
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AllExceptionsFilter } from './errors/all-exceptions.filter'
import { ResponseInterceptor } from './response/response.interceptor'
import { AppValidationPipe } from './validation/validation.pipe'

@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useClass: AppValidationPipe },
    // Route có @ResponseDto: chỉ trả các trường có @ApiField, bọc { data, meta }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class CommonModule {}
