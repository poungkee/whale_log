/**
 * @file terms.service.ts
 * @description 약관 서비스 - 약관 조회 및 동의 기록 비즈니스 로직
 *
 * @methods
 * - findAll: 약관 목록 조회
 * - agreeTerms: 약관 동의 처리
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Terms } from './entities/terms.entity';
import { TermsAgreement } from './entities/terms-agreement.entity';
import { AgreeTermsDto } from './dto/agree-terms.dto';

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Terms)
    private readonly termsRepository: Repository<Terms>,
    @InjectRepository(TermsAgreement)
    private readonly agreementRepository: Repository<TermsAgreement>,
  ) {}

  async findAll() {
    return this.termsRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async agree(userId: string, dto: AgreeTermsDto) {
    const agreements = dto.termsIds.map((termsId) =>
      this.agreementRepository.create({
        userId,
        termsId,
        agreed: true,
        agreedAt: new Date(),
      }),
    );

    await this.agreementRepository.save(agreements);
    return { message: 'Terms agreed successfully' };
  }

  async getAgreements(userId: string) {
    const terms = await this.termsRepository.find({
      where: { isActive: true },
    });

    const agreements = await this.agreementRepository.find({
      where: { userId },
    });

    const agreementMap = new Map(agreements.map((a) => [a.termsId, a]));

    return terms.map((term) => ({
      ...term,
      agreed: agreementMap.has(term.id) ? agreementMap.get(term.id)!.agreed : false,
      agreedAt: agreementMap.get(term.id)?.agreedAt || null,
    }));
  }

  /**
   * 약관 동의 철회 (Task #68)
   * - 선택 약관에 한해 철회 가능 (isRequired=true 약관은 철회 불가)
   * - agreed=false로 업데이트 (이력 보존)
   * - 동의 이력 없으면 NOOP (이미 미동의 상태)
   *
   * 사용 예: AI 학습 데이터 활용 동의 → 사용자가 마이페이지 토글 OFF 시 호출
   */
  async revoke(userId: string, termsId: string) {
    const term = await this.termsRepository.findOne({ where: { id: termsId } });
    if (!term) {
      return { ok: false, reason: '약관을 찾을 수 없습니다' };
    }
    if (term.isRequired) {
      return { ok: false, reason: '필수 약관은 철회할 수 없습니다' };
    }

    const agreement = await this.agreementRepository.findOne({
      where: { userId, termsId, agreed: true },
    });
    if (!agreement) {
      return { ok: true, message: '이미 미동의 상태입니다' };
    }

    agreement.agreed = false;
    await this.agreementRepository.save(agreement);
    return { ok: true, message: '동의가 철회되었습니다' };
  }
}
