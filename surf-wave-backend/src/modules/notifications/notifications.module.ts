import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { ConditionAlert } from './entities/condition-alert.entity';
import { FcmProvider } from './providers/fcm.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, ConditionAlert])],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
