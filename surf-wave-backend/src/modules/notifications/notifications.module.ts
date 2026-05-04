/**
 * @file notifications.module.ts
 * @description 알림 모듈 - FCM 푸시 알림 전송 및 파도 조건 알림 관리
 *
 * OnModuleInit으로 notifications_type_enum에 신규 값 자동 추가 (synchronize=false 대응).
 * PostgreSQL ALTER TYPE ADD VALUE는 트랜잭션 안에서 실행 불가 → 별도 connection으로 실행.
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { ConditionAlert } from './entities/condition-alert.entity';
import { FcmProvider } from './providers/fcm.provider';
import { FirebaseProvider } from '../../config/firebase.config';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, ConditionAlert])],
  controllers: [NotificationsController],
  providers: [FirebaseProvider, NotificationsService, FcmProvider],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  private readonly logger = new Logger(NotificationsModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 부팅 시 notifications_type_enum에 신규 알림 타입 추가
   *
   * Phase 2D 신고 시스템:
   * - CONTENT_HIDDEN: 내 콘텐츠가 관리자 숨김 처분 받았을 때 작성자에게 발송
   *
   * 멱등 패턴:
   * - PostgreSQL은 IF NOT EXISTS로 enum 값 추가 가능 (PG 12+)
   * - 이미 존재하면 NOOP, 없으면 추가
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(
        `ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'CONTENT_HIDDEN'`,
      );
      this.logger.log('notifications_type_enum.CONTENT_HIDDEN 값 확인 완료');
    } catch (err) {
      this.logger.error(`notifications enum 확장 실패: ${(err as Error).message}`);
    }
  }
}
