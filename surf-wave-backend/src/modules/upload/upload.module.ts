/**
 * @file upload.module.ts
 * @description 파일 업로드 모듈 - AWS S3 Presigned URL 발급
 */
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { S3Provider } from '../../config/aws.config';

@Module({
  controllers: [UploadController],
  providers: [S3Provider, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
