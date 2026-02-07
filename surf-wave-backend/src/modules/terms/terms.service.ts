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
}
