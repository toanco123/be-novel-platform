import { Global, Module } from '@nestjs/common'
import { StorageService } from './storage.service'

/** StorageService dùng chung (upload ảnh đại diện, bìa truyện ở các đợt sau) */
@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
