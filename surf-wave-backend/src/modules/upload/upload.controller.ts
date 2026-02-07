/**
 * @file upload.controller.ts
 * @description 업로드 컨트롤러 - S3 Presigned URL 발급 API
 *
 * @endpoints
 * - POST /upload/presigned-url  - Presigned URL 발급
 * - POST /upload/file           - 파일 직접 업로드
 */
import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.uploadService.uploadImage(file, user.id);
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload multiple images (max 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.uploadService.uploadImages(files, user.id);
  }

  @Post('presigned-url')
  @ApiOperation({ summary: 'Get presigned URL for direct S3 upload' })
  async getPresignedUrl(
    @Body() dto: PresignedUrlDto,
    @CurrentUser() user: User,
  ) {
    return this.uploadService.getPresignedUrl(dto, user.id);
  }
}
