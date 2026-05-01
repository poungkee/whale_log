/**
 * @file badges.controller.ts
 * @description 뱃지 컨트롤러
 *
 * - GET /badges/me — 내 뱃지 목록 (획득 여부 포함)
 * - GET /badges/me/earned — 내가 획득한 뱃지만
 * - POST /badges/track-guide-read — 모바일 가이드 진행도 동기화 + GUIDE_5/GUIDE_ALL 체크
 */

import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { BadgesService } from './badges.service';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

/**
 * 가이드 진행도 트래킹 DTO.
 * 모바일은 가이드 콘텐츠가 하드코딩이라 백엔드 guide_progress 테이블을 안 씀.
 * 클라이언트가 자체 카운팅한 결과(읽은 개수/전체 개수)를 보내고,
 * 백엔드는 GUIDE_READ 트리거를 발동시켜 GUIDE_5/GUIDE_ALL 체크.
 */
class TrackGuideReadDto {
  @IsInt()
  @Min(0)
  guideReadCount: number;

  @IsInt()
  @Min(1)
  totalGuideCount: number;
}

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /** 전체 뱃지 목록 + 내 획득 여부 (로그인 필요) */
  @Get('me')
  async getMyBadges(@CurrentUser() user: RequestUser) {
    return this.badgesService.getBadgesWithStatus(user.id);
  }

  /** 내가 획득한 뱃지만 */
  @Get('me/earned')
  async getEarnedBadges(@CurrentUser() user: RequestUser) {
    return this.badgesService.getEarnedBadges(user.id);
  }

  /**
   * 가이드 진행도 동기화 (모바일 전용)
   * 모바일에서 사용자가 가이드 항목을 펼쳐 읽을 때마다 호출.
   * 클라이언트의 자체 카운트를 받아 GUIDE_READ 트리거로 뱃지 체크.
   */
  @Post('track-guide-read')
  async trackGuideRead(
    @CurrentUser() user: RequestUser,
    @Body() dto: TrackGuideReadDto,
  ) {
    const newBadges = await this.badgesService.checkAndAward({
      userId: user.id,
      trigger: 'GUIDE_READ',
      guideReadCount: dto.guideReadCount,
      totalGuideCount: dto.totalGuideCount,
    });
    return { newBadges };
  }
}
