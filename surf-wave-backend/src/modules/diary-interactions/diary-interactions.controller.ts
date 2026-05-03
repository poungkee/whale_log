/**
 * @file diary-interactions.controller.ts
 * @description 다이어리 댓글 + 도움됐어요 API
 *
 * - GET    /diaries/:diaryId/comments         — 댓글 목록
 * - POST   /diaries/:diaryId/comments         — 댓글 작성
 * - PATCH  /diaries/:diaryId/comments/:id     — 댓글 수정 (본인만)
 * - DELETE /diaries/:diaryId/comments/:id     — 댓글 삭제 (본인만)
 * - GET    /diaries/:diaryId/helpful          — 도움됐어요 상태 (count + 본인 여부)
 * - POST   /diaries/:diaryId/helpful/toggle   — 도움됐어요 토글
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { DiaryInteractionsService } from './diary-interactions.service';

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}

@Controller('diaries/:diaryId')
export class DiaryInteractionsController {
  constructor(private readonly service: DiaryInteractionsService) {}

  /** 댓글 목록 */
  @Get('comments')
  async getComments(@Param('diaryId', ParseUUIDPipe) diaryId: string) {
    return this.service.getComments(diaryId);
  }

  /** 댓글 작성 */
  @Post('comments')
  async createComment(
    @CurrentUser() user: RequestUser,
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.service.createComment(user.id, diaryId, dto.content, dto.parentId);
  }

  /** 댓글 수정 */
  @Patch('comments/:commentId')
  async updateComment(
    @CurrentUser() user: RequestUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.service.updateComment(user.id, commentId, dto.content);
  }

  /** 댓글 삭제 */
  @Delete('comments/:commentId')
  async deleteComment(
    @CurrentUser() user: RequestUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.service.deleteComment(user.id, commentId);
  }

  /** 도움됐어요 상태 조회 */
  @Get('helpful')
  async getHelpful(
    @CurrentUser() user: RequestUser,
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
  ) {
    return this.service.getHelpfulStatus(user.id, diaryId);
  }

  /** 도움됐어요 토글 */
  @Post('helpful/toggle')
  async toggleHelpful(
    @CurrentUser() user: RequestUser,
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
  ) {
    return this.service.toggleHelpful(user.id, diaryId);
  }
}
