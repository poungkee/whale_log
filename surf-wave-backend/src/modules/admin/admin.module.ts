/**
 * @file admin.module.ts
 * @description 관리자 모듈 - 스팟/가이드 관리, 사용자 제재, 신고 처리, 공지 전송
 *
 * 등록된 엔티티:
 * - User: 사용자 목록 조회, 정지 처리, 역할 변경
 * - Spot: 스팟 CRUD
 * - Post: 게시글 숨김 처리
 * - Report: 신고 목록 조회 및 처리
 * - Guide: 가이드 CRUD
 * - SurfDiary: 대시보드 다이어리 통계 집계 (P1-1 추가)
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Spot } from '../spots/entities/spot.entity';
import { Post } from '../community/posts/entities/post.entity';
import { Report } from '../community/reports/entities/report.entity';
import { Guide } from '../guides/entities/guide.entity';
import { SurfDiary } from '../diary/entities/surf-diary.entity';
import { AdminLog } from './entities/admin-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    /** 관리자 서비스에서 사용하는 엔티티 레포지토리 등록 */
    TypeOrmModule.forFeature([User, Spot, Post, Report, Guide, SurfDiary, AdminLog]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
