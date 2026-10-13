// Thành phần dùng chung toàn app: filter lỗi, pipe validate bằng zod
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'
import { AllExceptionsFilter } from './errors/all-exceptions.filter'

@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class CoreModule {}
