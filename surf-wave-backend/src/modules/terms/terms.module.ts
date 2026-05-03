/**
 * @file terms.module.ts
 * @description 이용약관 모듈 - 서비스 약관 관리 및 동의 처리
 *
 * OnModuleInit으로 신규 약관 항목 자동 시드
 * (현재: AI 학습 데이터 활용 동의 — 선택)
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { Terms } from './entities/terms.entity';
import { TermsAgreement } from './entities/terms-agreement.entity';

/** 시드할 신규 약관 항목 — 이미 같은 title 있으면 스킵 */
const TERMS_SEED = [
  {
    title: 'AI 학습 데이터 활용 동의 (선택)',
    content: `Whale Log는 AI 자세 분석 기능을 베타 테스트 중입니다.

여러분이 다이어리에 업로드한 사진/영상은 AI 자세 분석 모델 학습에 활용될 수 있습니다.
- 사진/영상은 익명화되어 학습 데이터로 활용됩니다 (개인 식별 정보 제거)
- 학습 데이터는 외부에 판매·공유되지 않습니다
- 동의는 언제든 마이페이지 → 설정에서 철회 가능합니다
- 철회 시 기존 학습 데이터에서 본인 콘텐츠는 다음 모델 업데이트 시 제외됩니다

본 약관에 동의하시면 더 정확한 AI 자세 코칭을 받을 수 있도록 함께 만들어가는 것입니다.`,
    version: 1,
    isRequired: false,
    isActive: true,
  },
];

@Module({
  imports: [TypeOrmModule.forFeature([Terms, TermsAgreement])],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule implements OnModuleInit {
  private readonly logger = new Logger(TermsModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 부팅 시 신규 약관 항목 자동 INSERT
   * 동일 title 있으면 스킵 (멱등)
   */
  async onModuleInit() {
    let inserted = 0;
    for (const term of TERMS_SEED) {
      try {
        const existing = await this.dataSource.query(
          `SELECT 1 FROM terms WHERE title = $1 LIMIT 1`,
          [term.title],
        );
        if (existing.length > 0) continue;
        await this.dataSource.query(
          `INSERT INTO terms (title, content, version, is_required, is_active)
           VALUES ($1, $2, $3, $4, $5)`,
          [term.title, term.content, term.version, term.isRequired, term.isActive],
        );
        inserted++;
      } catch (err) {
        this.logger.warn(`약관 시드 실패 (${term.title}): ${(err as Error).message}`);
      }
    }
    if (inserted > 0) {
      this.logger.log(`약관 시드: 신규 ${inserted}개 추가 / 전체 ${TERMS_SEED.length}개`);
    }
  }
}
