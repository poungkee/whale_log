/**
 * @file upload.service.ts
 * @description 업로드 서비스 - S3 Presigned URL 생성 비즈니스 로직
 *
 * @methods
 * - generatePresignedUrl: Presigned URL 생성
 * - uploadFile: 파일 직접 업로드
 */
import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_CLIENT } from '../../config/aws.config';
import { v4 as uuidv4 } from 'uuid';
import { PresignedUrlDto } from './dto/presigned-url.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private s3Client: S3Client | null,
    private configService: ConfigService,
  ) {
    this.bucket = this.configService.get('AWS_S3_BUCKET', 'surfwave-uploads');
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string }> {
    this.validateFile(file);

    const key = this.generateKey(userId, file.originalname);
    const url = await this.uploadToS3(key, file.buffer, file.mimetype);

    return { url };
  }

  async uploadImages(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<{ urls: string[] }> {
    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed');
    }

    files.forEach((file) => this.validateFile(file));

    const urls = await Promise.all(
      files.map(async (file) => {
        const key = this.generateKey(userId, file.originalname);
        return this.uploadToS3(key, file.buffer, file.mimetype);
      }),
    );

    return { urls };
  }

  async getPresignedUrl(
    dto: PresignedUrlDto,
    userId: string,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    if (!ALLOWED_MIME_TYPES.includes(dto.contentType)) {
      throw new BadRequestException('Invalid file type');
    }

    if (!this.s3Client) {
      throw new BadRequestException('S3 not configured');
    }

    const key = this.generateKey(userId, dto.filename);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    const fileUrl = `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }

  private generateKey(userId: string, originalName: string): string {
    const ext = originalName.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `uploads/${userId}/${timestamp}-${uuid}.${ext}`;
  }

  private async uploadToS3(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.s3Client) {
      // Return mock URL for development without S3
      this.logger.warn('S3 not configured, returning mock URL');
      return `https://mock-s3.local/${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
