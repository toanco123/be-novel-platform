import { Global, Module } from '@nestjs/common'
import { ErrorLogger } from './error-logger.service'

/** ErrorLogger dùng chung cho API và worker */
@Global()
@Module({ providers: [ErrorLogger], exports: [ErrorLogger] })
export class ErrorsModule {}
