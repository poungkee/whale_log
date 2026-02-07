/**
 * @file notifications.controller.ts
 * @description 알림 컨트롤러 - 알림 목록 조회, 읽음 처리, 조건 알림 설정 API
 *
 * @endpoints
 * - GET    /notifications               - 알림 목록 조회
 * - PATCH  /notifications/:id/read      - 알림 읽음 처리
 * - POST   /notifications/condition-alerts   - 파도 조건 알림 생성
 * - GET    /notifications/condition-alerts   - 조건 알림 목록 조회
 * - PATCH  /notifications/condition-alerts/:id - 조건 알림 수정
 * - DELETE /notifications/condition-alerts/:id - 조건 알림 삭제
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
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateConditionAlertDto } from './dto/create-condition-alert.dto';
import { UpdateConditionAlertDto } from './dto/update-condition-alert.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Get my notifications' })
  async getNotifications(@CurrentUser() user: User, @Query() query: PaginationDto) {
    return this.notificationsService.findByUser(user.id, query);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Get('condition-alerts')
  @ApiOperation({ summary: 'Get my condition alerts' })
  async getConditionAlerts(@CurrentUser() user: User) {
    return this.notificationsService.getConditionAlerts(user.id);
  }

  @Post('condition-alerts')
  @ApiOperation({ summary: 'Create condition alert' })
  async createConditionAlert(
    @CurrentUser() user: User,
    @Body() dto: CreateConditionAlertDto,
  ) {
    return this.notificationsService.createConditionAlert(user.id, dto);
  }

  @Patch('condition-alerts/:alertId')
  @ApiOperation({ summary: 'Update condition alert' })
  async updateConditionAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateConditionAlertDto,
  ) {
    return this.notificationsService.updateConditionAlert(alertId, user.id, dto);
  }

  @Delete('condition-alerts/:alertId')
  @ApiOperation({ summary: 'Delete condition alert' })
  async deleteConditionAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.deleteConditionAlert(alertId, user.id);
  }
}
