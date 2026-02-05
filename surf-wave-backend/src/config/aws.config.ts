import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

export const S3_CLIENT = 'S3_CLIENT';

export interface AwsS3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export const getAwsS3Config = (configService: ConfigService): AwsS3Config => {
  return {
    region: configService.get<string>('AWS_REGION', 'ap-northeast-2'),
    accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID', ''),
    secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
    bucket: configService.get<string>('AWS_S3_BUCKET', 'surfwave-uploads'),
  };
};

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
