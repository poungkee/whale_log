import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ForecastsModule } from '../forecasts/forecasts.module';

@Module({
  imports: [ForecastsModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
