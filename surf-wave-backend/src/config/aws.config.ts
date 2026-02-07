/**
 * @file aws.config.ts
 * @description AWS S3 설정 및 프로바이더 - 이미지 파일 저장소
 *
 * 서핑 다이어리 이미지, 게시글 이미지, 프로필 사진 등의 파일을
 * AWS S3 버킷에 업로드하기 위한 S3 클라이언트를 설정합니다.
 *
 * 환경 변수:
 * - AWS_REGION: AWS 리전 (기본값: ap-northeast-2, 서울)
 * - AWS_ACCESS_KEY_ID: AWS IAM 액세스 키
 * - AWS_SECRET_ACCESS_KEY: AWS IAM 시크릿 키
 * - AWS_S3_BUCKET: S3 버킷명 (기본값: surfwave-uploads)
 *
 * 자격 증명이 없으면 null을 반환하여 개발 환경에서도 에러 없이 실행 가능합니다.
 */

import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

/** S3 클라이언트 DI 토큰 - @Inject(S3_CLIENT)로 주입받을 때 사용 */
export const S3_CLIENT = 'S3_CLIENT';

/** AWS S3 설정 인터페이스 */
export interface AwsS3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** 환경 변수에서 AWS S3 설정값을 읽어오는 팩토리 함수 */
export const getAwsS3Config = (configService: ConfigService): AwsS3Config => {
  return {
    region: configService.get<string>('AWS_REGION', 'ap-northeast-2'),
    accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID', ''),
    secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
    bucket: configService.get<string>('AWS_S3_BUCKET', 'surfwave-uploads'),
  };
};

/**
 * S3 프로바이더 - NestJS DI에 S3Client를 등록하는 프로바이더
 * 자격 증명이 없으면 null을 반환 (개발 환경 대응)
 */
export const S3Provider: Provider = {
  provide: S3_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): S3Client | null => {
    const logger = new Logger('AwsConfig');
    const config = getAwsS3Config(configService);

    if (!config.accessKeyId || !config.secretAccessKey) {
      logger.warn(
        'AWS credentials not configured. S3 services will be unavailable.',
      );
      return null;
    }

    try {
      const client = new S3Client({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

      logger.log(
        `S3 client initialized for region: ${config.region}, bucket: ${config.bucket}`,
      );
      return client;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to initialize S3 client: ${message}`);
      return null;
    }
  },
};
