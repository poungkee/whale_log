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
 *
 * OnModuleInit으로 admin_logs 테이블 + enum 자동 생성 (synchronize=false 대응).
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
export class AdminModule implements OnModuleInit {
  private readonly logger = new Logger(AdminModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 모듈 초기화 시 admin_logs 관련 enum + 테이블이 없으면 생성
   * (synchronize=false 프로덕션 환경에서도 안전하게 동작)
   *
   * PostgreSQL enum 타입은 CREATE TYPE에 IF NOT EXISTS가 없어서
   * DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$ 패턴 사용.
   */
  async onModuleInit() {
    try {
      /** enum 타입 — 액션 종류 (최초 생성) */
      await this.dataSource.query(`
        DO $$ BEGIN
          CREATE TYPE "admin_logs_action_type_enum" AS ENUM (
            'SUSPEND_USER','UNSUSPEND_USER','CHANGE_ROLE',
            'HIDE_POST','SHOW_POST','DELETE_SPOT','DELETE_GUIDE',
            'RESOLVE_REPORT','BROADCAST'
          );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      /**
       * Phase 2D — 다이어리 숨김/숨김해제 액션 추가
       * ALTER TYPE ADD VALUE는 트랜잭션 외부에서만 실행 가능 → IF NOT EXISTS로 멱등 처리
       */
      await this.dataSource.query(
        `ALTER TYPE "admin_logs_action_type_enum" ADD VALUE IF NOT EXISTS 'HIDE_DIARY'`,
      );
      await this.dataSource.query(
        `ALTER TYPE "admin_logs_action_type_enum" ADD VALUE IF NOT EXISTS 'UNHIDE_DIARY'`,
      );

      /** enum 타입 — 대상 리소스 종류 (최초 생성) */
      await this.dataSource.query(`
        DO $$ BEGIN
          CREATE TYPE "admin_logs_target_type_enum" AS ENUM (
            'USER','POST','SPOT','GUIDE','REPORT','SYSTEM'
          );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      /** Phase 2D — DIARY 대상 타입 추가 */
      await this.dataSource.query(
        `ALTER TYPE "admin_logs_target_type_enum" ADD VALUE IF NOT EXISTS 'DIARY'`,
      );

      /** admin_logs 테이블 */
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
          action_type admin_logs_action_type_enum NOT NULL,
          target_type admin_logs_target_type_enum,
          target_id uuid,
          description text,
          metadata jsonb,
          ip_address varchar(45),
          created_at timestamptz DEFAULT now() NOT NULL
        )
      `);

      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_admin_logs_admin" ON admin_logs(admin_id)`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_admin_logs_created" ON admin_logs(created_at)`,
      );

      this.logger.log('admin_logs 테이블 + enum 확인 완료');
    } catch (err) {
      this.logger.error(`admin_logs 초기화 실패: ${(err as Error).message}`);
    }
  }
}
