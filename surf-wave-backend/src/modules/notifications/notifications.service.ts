/**
 * @file notifications.service.ts
 * @description 알림 서비스 - 알림 생성/조회/읽음처리, 조건 알림 CRUD
 *
 * @methods
 * - getNotifications: 알림 목록 조회
 * - markAsRead: 알림 읽음 처리
 * - createConditionAlert: 파도 조건 알림 생성
 * - getConditionAlerts: 조건 알림 목록 조회
 * - updateConditionAlert: 조건 알림 수정
 * - deleteConditionAlert: 조건 알림 삭제
 * - sendNotification: 알림 전송
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { ConditionAlert } from './entities/condition-alert.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateConditionAlertDto } from './dto/create-condition-alert.dto';
import { UpdateConditionAlertDto } from './dto/update-condition-alert.dto';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { FcmProvider } from './providers/fcm.provider';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(ConditionAlert)
    private readonly alertRepository: Repository<ConditionAlert>,
    private readonly fcmProvider: FcmProvider,
  ) {}

  async findByUser(userId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: notifications,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.update(id, { isRead: true });
    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      body,
      data,
    });

    return this.notificationRepository.save(notification);
  }

  async getConditionAlerts(userId: string) {
    return this.alertRepository.find({
      where: { userId },
      relations: ['spot'],
      order: { createdAt: 'DESC' },
    });
  }

  async createConditionAlert(userId: string, dto: CreateConditionAlertDto) {
    const alert = this.alertRepository.create({
      userId,
      spotId: dto.spotId,
      minWaveHeight: dto.minWaveHeight,
      maxWindSpeed: dto.maxWindSpeed,
    });

    return this.alertRepository.save(alert);
  }

  async updateConditionAlert(
    alertId: string,
    userId: string,
    dto: UpdateConditionAlertDto,
  ) {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Condition alert not found');
    }
    if (alert.userId !== userId) {
      throw new ForbiddenException('You can only update your own alerts');
    }

    Object.assign(alert, dto);
    return this.alertRepository.save(alert);
  }

  async deleteConditionAlert(alertId: string, userId: string) {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Condition alert not found');
    }
    if (alert.userId !== userId) {
      throw new ForbiddenException('You can only delete your own alerts');
    }

    await this.alertRepository.delete(alertId);
    return { message: 'Condition alert deleted' };
  }
}
