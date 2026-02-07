/**
 * @file update-comment.dto.ts
 * @description 댓글 수정 요청 DTO
 */
import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content: string;
}
