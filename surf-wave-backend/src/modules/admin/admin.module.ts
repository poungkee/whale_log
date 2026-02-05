import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Spot } from '../spots/entities/spot.entity';
import { Post } from '../community/posts/entities/post.entity';
import { Report } from '../community/reports/entities/report.entity';
import { Guide } from '../guides/entities/guide.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Spot, Post, Report, Guide]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
