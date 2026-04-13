/**
 * @file khoa.module.ts
 * @description 해양수산부 국립해양조사원(KHOA) 서핑지수 모듈
 *
 * KhoaSurfingService를 export하여 ForecastsModule에서 주입 가능하게 함
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KhoaSurfingService } from './khoa-surfing.service';

@Module({
  imports: [HttpModule],
  providers: [KhoaSurfingService],
  exports: [KhoaSurfingService],
})
export class KhoaModule {}
