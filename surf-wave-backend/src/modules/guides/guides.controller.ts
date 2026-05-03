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
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GuidesService } from './guides.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { GuideQueryDto } from './dto/guide-query.dto';

@ApiTags('guides')
@ApiBearerAuth()
@Controller('guides')
export class GuidesController {
  constructor(
    private readonly guidesService: GuidesService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * 임시 진단 엔드포인트 — 가이드 DB 상태 직접 확인 (인증 없이)
   * 시드 INSERT 후 DB에 가이드가 들어갔는지 빠르게 검증.
   * 출시 직전 제거 권장.
   */
  @Get('_debug/count')
  @Public()
  @ApiOperation({ summary: '[디버그] 가이드 개수 확인 (무인증)' })
  async debugCount() {
    const result = await this.dataSource.query(
      `SELECT category, COUNT(*) as cnt, BOOL_OR(is_published) as has_published
       FROM guides GROUP BY category ORDER BY category`,
    );
    const total = await this.dataSource.query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_published = true) as published
       FROM guides`,
    );
    return {
      total: parseInt(total[0].total, 10),
      published: parseInt(total[0].published, 10),
      byCategory: result.map((r: any) => ({
        category: r.category,
        count: parseInt(r.cnt, 10),
        hasPublished: r.has_published,
      })),
    };
  }

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
