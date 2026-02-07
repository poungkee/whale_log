import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ForecastsService } from '../forecasts/forecasts.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Public()
  @Get('forecasts')
  @ApiOperation({ summary: 'Get all spots with current forecast (public)' })
  async getDashboardForecasts(@Query() query: DashboardQueryDto) {
    return this.forecastsService.getDashboardData(query.level);
  }
}
