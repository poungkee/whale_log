/**
 * @file users.controller.ts
 * @description 사용자 컨트롤러 - 프로필 관리 API 엔드포인트
 *
 * 모든 엔드포인트는 JWT 인증이 필요합니다 (Authorization: Bearer {token})
 *
 * API 엔드포인트 목록:
 * - GET    /api/v1/users/me           : 내 프로필 조회
 * - PATCH  /api/v1/users/me           : 내 프로필 수정 (닉네임, 자기소개, 서핑 레벨 등)
 * - PATCH  /api/v1/users/me/fcm-token : FCM 푸시 토큰 업데이트
 * - GET    /api/v1/users/me/stats     : 내 활동 통계 조회
 * - GET    /api/v1/users/:userId      : 다른 사용자 공개 프로필 조회
 *
 * 레벨 선택 저장: PATCH /api/v1/users/me + { surfLevel: "BEGINNER" } 으로 처리
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

@ApiTags('users') // Swagger 문서에서 'users' 그룹으로 분류
@ApiBearerAuth()  // 모든 엔드포인트에 Bearer 토큰 인증 필요 표시
@Controller('users') // 기본 경로: /api/v1/users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 내 프로필 조회
   *
   * JWT 토큰에서 추출한 사용자 ID로 DB에서 전체 프로필 정보를 조회합니다.
   * 응답: User 엔티티의 모든 필드 (passwordHash 제외 권장 - TODO: select 제한)
   *
   * @param user - JWT에서 추출한 사용자 정보 { id, email, role }
   */
  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  async getMyProfile(@CurrentUser() user: RequestUser) {
    /** user.id = JWT의 sub 필드 (사용자 UUID) */
    const fullUser = await this.usersService.findById(user.id);
    /** passwordHash 등 민감 정보 제거 후 반환 */
    return this.usersService.sanitizeUser(fullUser);
  }

  /**
   * 내 프로필 수정
   *
   * 변경하고 싶은 필드만 Body에 포함하여 전달하면 됩니다.
   * 서핑 레벨 선택(온보딩)도 이 엔드포인트를 사용합니다.
   *
   * 요청 예시:
   * - 레벨 선택: { "surfLevel": "BEGINNER" }
   * - 닉네임 변경: { "nickname": "새닉네임" }
   * - 여러 필드 동시 변경: { "nickname": "파도왕", "bio": "서핑 좋아요" }
   *
   * @param user - JWT에서 추출한 사용자 정보
   * @param updateProfileDto - 수정할 프로필 데이터 (모든 필드 선택적)
   */
  @Patch('me')
  @ApiOperation({ summary: '내 프로필 수정 (레벨 선택 포함)' })
  @ApiResponse({ status: 200, description: '프로필 수정 성공 - 수정된 사용자 정보 반환' })
  async updateMyProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.update(user.id, updateProfileDto);
    /** passwordHash 등 민감 정보 제거 후 반환 */
    return this.usersService.sanitizeUser(updated);
  }

  /**
   * FCM 토큰 업데이트
   *
   * 모바일 앱에서 푸시 알림을 받기 위한 Firebase Cloud Messaging 토큰을 갱신합니다.
   * 앱 시작 시 또는 토큰이 변경될 때 호출합니다.
   *
   * @param user - JWT에서 추출한 사용자 정보
   * @param updateFcmTokenDto - { fcmToken: 새로운FCM토큰문자열 }
   */
  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'FCM 푸시 알림 토큰 업데이트' })
  @ApiResponse({ status: 200, description: 'FCM 토큰 업데이트 성공' })
  async updateFcmToken(
    @CurrentUser() user: RequestUser,
    @Body() updateFcmTokenDto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(user.id, updateFcmTokenDto.fcmToken);
  }

  /**
   * 내 활동 통계 조회
   *
   * 사용자의 서핑 활동 통계를 반환합니다.
   * 응답: { totalDiaries, totalPosts, totalComments, totalFavoriteSpots, surfDaysThisMonth, surfDaysThisYear }
   *
   * @param user - JWT에서 추출한 사용자 정보
   */
  @Get('me/stats')
  @ApiOperation({ summary: '내 활동 통계 조회' })
  @ApiResponse({ status: 200, description: '통계 조회 성공' })
  async getMyStats(@CurrentUser() user: RequestUser) {
    return this.usersService.getStats(user.id);
  }

  /**
   * 다른 사용자 공개 프로필 조회
   *
   * 지정한 사용자 ID의 공개 프로필 정보만 반환합니다.
   * 비공개 정보(이메일, FCM 토큰 등)는 제외됩니다.
   *
   * 응답: { id, nickname, bio, avatarUrl, surfLevel, createdAt }
   *
   * @param userId - 조회할 사용자의 UUID
   */
  @Get(':userId')
  @ApiOperation({ summary: '다른 사용자 공개 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getUserProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.getPublicProfile(userId);
  }
}
