/**
 * @file notifications.module.ts
 * @description 알림 모듈 - FCM 푸시 알림 전송 및 파도 조건 알림 관리
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
export class NotificationsModule {}
