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
import * as fs from 'fs';
import * as path from 'path';

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

  /**
   * S3에 파일 업로드 — S3 미설정 시 로컬 파일 시스템에 저장
   *
   * 로컬 저장 경로: {프로젝트루트}/uploads/{userId}/{timestamp}-{uuid}.{ext}
   * 로컬 접근 URL: /uploads/{userId}/{timestamp}-{uuid}.{ext}
   * → NestJS ServeStaticModule 또는 express.static으로 서빙
   *
   * @param key - S3 키 or 로컬 파일 경로 (uploads/userId/filename.ext)
   * @param body - 파일 바이너리 데이터
   * @param contentType - MIME 타입
   * @returns 접근 가능한 URL
   */
  private async uploadToS3(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.s3Client) {
      /**
       * S3 미설정 → 로컬 파일 시스템에 저장 (개발/테스트용)
       * 파일 경로: {cwd}/uploads/{userId}/{filename}
       * 반환 URL: /uploads/{userId}/{filename} (NestJS static 서빙)
       */
      this.logger.warn('S3 미설정 → 로컬 파일 시스템에 저장');
      const localPath = path.join(process.cwd(), key);
      const dir = path.dirname(localPath);

      /** 디렉토리가 없으면 생성 (recursive) */
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, body);

      /** 슬래시 통일 (Windows 호환) + 앞에 / 붙여서 URL 형태로 */
      return `/${key.replace(/\\/g, '/')}`;
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
