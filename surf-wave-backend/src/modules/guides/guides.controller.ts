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
import { GUIDE_SEED } from '../../database/seeds/guides-data';

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
  /**
   * [디버그] 시드 강제 실행 + 단계별 결과 반환
   * GUIDE_SEED import 상태 + INSERT 결과 + 에러 메시지를 한 번에 반환.
   * 이걸로 OnModuleInit이 왜 안 됐는지 핀포인트 가능.
   */
  @Get('_debug/seed-now')
  @Public()
  @ApiOperation({ summary: '[디버그] 시드 강제 실행' })
  async debugSeedNow() {
    const seedSize = GUIDE_SEED?.length ?? -1;
    let inserted = 0;
    let skipped = 0;
    const errors: { title: string; error: string }[] = [];

    if (!Array.isArray(GUIDE_SEED) || GUIDE_SEED.length === 0) {
      return {
        ok: false,
        reason: 'GUIDE_SEED import 실패 또는 빈 배열',
        seedSize,
      };
    }

    for (const item of GUIDE_SEED) {
      try {
        /** 두 단계 처리 — $1 타입 추론 충돌 회피 */
        const existing = await this.dataSource.query(
          `SELECT 1 FROM guides WHERE title = $1 LIMIT 1`,
          [item.title],
        );
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        await this.dataSource.query(
          `INSERT INTO guides (title, content, category, sort_order, estimated_read_minutes, is_published)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.title,
            item.content,
            item.category,
            item.sortOrder,
            item.estimatedReadMinutes,
            item.isPublished,
          ],
        );
        inserted++;
      } catch (err) {
        errors.push({ title: item.title, error: (err as Error).message });
      }
    }

    return {
      ok: errors.length === 0,
      seedSize,
      inserted,
      skipped,
      errorCount: errors.length,
      sampleErrors: errors.slice(0, 3),
    };
  }

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
