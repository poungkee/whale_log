/**
 * @file webcam.module.ts
 * @description Windy 웹캠 프록시 모듈
 */

import { Module } from '@nestjs/common';
import { WebcamController } from './webcam.controller';
import { WebcamService } from './webcam.service';

@Module({
  controllers: [WebcamController],
  providers: [WebcamService],
})
export class WebcamModule {}
