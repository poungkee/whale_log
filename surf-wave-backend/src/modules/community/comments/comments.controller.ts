/**
 * @file comments.controller.ts
 * @description 댓글 컨트롤러 - 댓글/대댓글 CRUD API
 *
 * @endpoints
 * - POST   /posts/:postId/comments      - 댓글 작성
 * - GET    /posts/:postId/comments      - 댓글 목록 조회
 * - PATCH  /posts/:postId/comments/:id  - 댓글 수정
 * - DELETE /posts/:postId/comments/:id  - 댓글 삭제
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('community')
@ApiBearerAuth()
@Controller('community')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for post' })
  async getComments(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: PaginationDto,
  ) {
    return this.commentsService.findByPost(postId, query);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Create comment on post' })
  async createComment(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, user.id, createCommentDto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update comment' })
  async updateComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, user.id, updateCommentDto);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.delete(commentId, user.id);
  }
}
