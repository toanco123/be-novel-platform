// Thành phần dùng chung toàn app: filter lỗi, pipe validate (class-validator)
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { AllExceptionsFilter } from './errors/all-exceptions.filter'
import { createValidationPipe } from './validation/validation.pipe'

@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class CommonModule {}
