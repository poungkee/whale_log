/**
 * @file posts.controller.ts
 * @description 게시글 컨트롤러 - 커뮤니티 게시글 CRUD, 좋아요, 북마크, 신고 API
 *
 * @endpoints
 * - POST   /posts              - 게시글 작성
 * - GET    /posts              - 게시글 목록 조회
 * - GET    /posts/:id          - 게시글 상세 조회
 * - PATCH  /posts/:id          - 게시글 수정
 * - DELETE /posts/:id          - 게시글 삭제
 * - POST   /posts/:id/like     - 좋아요 토글
 * - POST   /posts/:id/bookmark - 북마크 토글
 * - POST   /posts/:id/report   - 게시글 신고
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
import { PostsService } from './posts.service';
import { LikesService } from '../likes/likes.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { ReportsService } from '../reports/reports.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { ReportPostDto } from './dto/report-post.dto';

@ApiTags('community')
@ApiBearerAuth()
@Controller('community')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly likesService: LikesService,
    private readonly bookmarksService: BookmarksService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('posts')
  @ApiOperation({ summary: 'Get posts list' })
  async getPosts(@Query() query: PostQueryDto, @CurrentUser() user: User) {
    return this.postsService.findAll(query, user.id);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get post detail' })
  async getPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
  ) {
    return this.postsService.findById(postId, user.id);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create new post' })
  async createPost(@CurrentUser() user: User, @Body() createPostDto: CreatePostDto) {
    return this.postsService.create(user.id, createPostDto);
  }

  @Patch('posts/:postId')
  @ApiOperation({ summary: 'Update post' })
  async updatePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(postId, user.id, updatePostDto);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Delete post' })
  async deletePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
  ) {
    return this.postsService.delete(postId, user.id);
  }

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Toggle like on post' })
  async toggleLike(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
  ) {
    return this.likesService.toggle(postId, user.id);
  }

  @Post('posts/:postId/bookmark')
  @ApiOperation({ summary: 'Toggle bookmark on post' })
  async toggleBookmark(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
  ) {
    return this.bookmarksService.toggle(postId, user.id);
  }

  @Post('posts/:postId/report')
  @ApiOperation({ summary: 'Report post' })
  async reportPost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
    @Body() reportDto: ReportPostDto,
  ) {
    return this.reportsService.createPostReport(postId, user.id, reportDto);
  }

  @Get('bookmarks')
  @ApiOperation({ summary: 'Get my bookmarked posts' })
  async getBookmarks(@CurrentUser() user: User, @Query() query: PostQueryDto) {
    return this.bookmarksService.getMyBookmarks(user.id, query);
  }
}
