/**
 * @file webcam.module.ts
 * @description Windy 웹캠 프록시 모듈
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebcamController } from './webcam.controller';
import { WebcamService } from './webcam.service';

@Module({
  imports: [HttpModule],
  controllers: [WebcamController],
  providers: [WebcamService],
})
export class WebcamModule {}
