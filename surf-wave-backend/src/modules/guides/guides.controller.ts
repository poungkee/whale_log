/**
 * @file guides.controller.ts
 * @description 가이드 컨트롤러 - 서핑 교육 콘텐츠 조회, 학습 진행도 API
 *
 * @endpoints
 * - GET  /guides          - 가이드 목록 조회
 * - GET  /guides/:id      - 가이드 상세 조회
 * - POST /guides/:id/progress - 학습 진행도 업데이트
 */
import { Controller, Get, Post, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuidesService } from './guides.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { GuideQueryDto } from './dto/guide-query.dto';

@ApiTags('guides')
@ApiBearerAuth()
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  @ApiOperation({ summary: 'Get guides list' })
  async getGuides(@Query() query: GuideQueryDto, @CurrentUser() user: User) {
    return this.guidesService.findAll(query, user.id);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get my learning progress' })
  async getProgress(@CurrentUser() user: User) {
    return this.guidesService.getProgress(user.id);
  }

  @Get(':guideId')
  @ApiOperation({ summary: 'Get guide detail' })
  async getGuide(
    @Param('guideId', ParseUUIDPipe) guideId: string,
    @CurrentUser() user: User,
  ) {
    return this.guidesService.findById(guideId, user.id);
  }

  @Post(':guideId/complete')
  @ApiOperation({ summary: 'Mark guide as completed' })
  async completeGuide(
    @Param('guideId', ParseUUIDPipe) guideId: string,
    @CurrentUser() user: User,
  ) {
    return this.guidesService.markComplete(guideId, user.id);
  }
}
