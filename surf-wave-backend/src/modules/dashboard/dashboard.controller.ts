import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ForecastsService } from '../forecasts/forecasts.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly forecastsService: ForecastsService) {}

  /**
   * 대시보드 예보 조회 (공개 API)
   *
   * 쿼리 파라미터:
   * - level: 서핑 레벨 필터 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
   * - boardType: 보드 타입 (LONGBOARD | MIDLENGTH | SHORTBOARD) - hints에 보드별 팁 포함
   */
  @Public()
  @Get('forecasts')
  @ApiOperation({ summary: '전체 스팟 현재 예보 + 서핑 적합도 + hints (공개)' })
  async getDashboardForecasts(@Query() query: DashboardQueryDto) {
    return this.forecastsService.getDashboardData(query.level, query.boardType);
  }
}
