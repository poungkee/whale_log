import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts/posts.controller';
import { PostsService } from './posts/posts.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { LikesService } from './likes/likes.service';
import { BookmarksService } from './bookmarks/bookmarks.service';
import { ReportsService } from './reports/reports.service';
import { Post } from './posts/entities/post.entity';
import { PostImage } from './posts/entities/post-image.entity';
import { Comment } from './comments/entities/comment.entity';
import { Like } from './likes/like.entity';
import { Bookmark } from './bookmarks/bookmark.entity';
import { Report } from './reports/entities/report.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostImage, Comment, Like, Bookmark, Report]),
    NotificationsModule,
  ],
  controllers: [PostsController, CommentsController],
  providers: [
    PostsService,
    CommentsService,
    LikesService,
    BookmarksService,
    ReportsService,
  ],
  exports: [PostsService, CommentsService],
})
export class CommunityModule {}
