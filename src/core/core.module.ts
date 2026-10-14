// Thành phần dùng chung toàn app: filter lỗi, pipe validate (class-validator)
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { AllExceptionsFilter } from './errors/all-exceptions.filter'
import { createValidationPipe } from './http/validation'

@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class CoreModule {}
