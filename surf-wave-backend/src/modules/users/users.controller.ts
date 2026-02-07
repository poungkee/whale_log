/**
 * @file users.controller.ts
 * @description 사용자 컨트롤러 - 프로필 관리 API 엔드포인트
 *
 * 엔드포인트 목록 (모두 인증 필요):
 * - GET    /api/v1/users/me           : 내 프로필 조회
 * - PATCH  /api/v1/users/me           : 내 프로필 수정
 * - PATCH  /api/v1/users/me/fcm-token : FCM 푸시 토큰 업데이트
 * - GET    /api/v1/users/me/stats     : 내 활동 통계 조회
 * - GET    /api/v1/users/:userId      : 다른 사용자 프로필 조회 (공개 정보만)
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users/me - 현재 로그인한 사용자의 전체 프로필 정보 조회 */
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  async getMyProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  /** PATCH /users/me - 닉네임, 자기소개, 프로필 사진, 서핑 레벨 등 프로필 수정 */
  @Patch('me')
  @ApiOperation({ summary: 'Update my profile' })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.update(user.id, updateProfileDto);
  }

  /** PATCH /users/me/fcm-token - 모바일 푸시 알림을 위한 FCM 토큰 갱신 */
  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Update FCM token for push notifications' })
  async updateFcmToken(
    @CurrentUser() user: User,
    @Body() updateFcmTokenDto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(user.id, updateFcmTokenDto.fcmToken);
  }

  /** GET /users/me/stats - 내 활동 통계 조회 (다이어리 수, 게시글 수, 서핑 일수 등) */
  @Get('me/stats')
  @ApiOperation({ summary: 'Get my statistics' })
  async getMyStats(@CurrentUser() user: User) {
    return this.usersService.getStats(user.id);
  }

  /** GET /users/:userId - 다른 사용자의 공개 프로필 조회 (닉네임, 프로필사진, 서핑레벨 등) */
  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile by ID' })
  async getUserProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.getPublicProfile(userId);
  }
}
