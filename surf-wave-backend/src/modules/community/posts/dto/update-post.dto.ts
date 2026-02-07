/**
 * @file update-post.dto.ts
 * @description 게시글 수정 요청 DTO
 */
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, ['spotId'] as const),
) {}
