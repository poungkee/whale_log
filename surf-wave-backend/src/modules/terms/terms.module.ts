/**
 * @file terms.module.ts
 * @description 이용약관 모듈 - 서비스 약관 관리 및 동의 처리
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { Terms } from './entities/terms.entity';
import { TermsAgreement } from './entities/terms-agreement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Terms, TermsAgreement])],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
