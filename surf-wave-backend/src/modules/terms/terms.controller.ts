/**
 * @file terms.controller.ts
 * @description 약관 컨트롤러 - 약관 조회, 동의 처리 API
 *
 * @endpoints
 * - GET  /terms       - 약관 목록 조회
 * - POST /terms/agree - 약관 동의 처리
 */
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TermsService } from './terms.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { AgreeTermsDto } from './dto/agree-terms.dto';

@ApiTags('terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active terms list' })
  async getTerms() {
    return this.termsService.findAll();
  }

  @Post('agree')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agree to terms' })
  async agreeTerms(@CurrentUser() user: User, @Body() dto: AgreeTermsDto) {
    return this.termsService.agree(user.id, dto);
  }

  @Get('agreements')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my terms agreements' })
  async getAgreements(@CurrentUser() user: User) {
    return this.termsService.getAgreements(user.id);
  }
}
