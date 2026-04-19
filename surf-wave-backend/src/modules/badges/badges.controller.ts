/**
 * @file badges.controller.ts
 * @description 뱃지 컨트롤러
 *
 * - GET /badges/me — 내 뱃지 목록 (획득 여부 포함)
 * - GET /badges/me/earned — 내가 획득한 뱃지만
 */

import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

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
}
