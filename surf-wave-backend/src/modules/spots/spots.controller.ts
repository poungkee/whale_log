/**
 * @file spots.controller.ts
 * @description 서핑 스팟 컨트롤러 - 해변 정보 조회, 즐겨찾기, 투표 API
 *
 * 엔드포인트:
 * - GET    /spots             : 스팟 목록 조회 (지역, 난이도, 검색어 필터)
 * - GET    /spots/nearby      : 주변 스팟 검색 (위도/경도/반경 기반)
 * - GET    /spots/favorites   : 내 즐겨찾기 스팟 목록 (인증 필요)
 * - GET    /spots/:spotId     : 스팟 상세 정보 조회
 * - GET    /spots/:spotId/votes : 오늘의 투표 분포 조회
 * - POST   /spots/:spotId/vote : 스팟 컨디션 투표 (하루 1회, 인증 필요)
 * - POST   /spots/:spotId/favorite : 즐겨찾기 추가 (인증 필요)
 * - DELETE /spots/:spotId/favorite : 즐겨찾기 제거 (인증 필요)
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SpotsService } from './spots.service';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SpotQueryDto } from './dto/spot-query.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('spots')
@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get spots list with filters' })
  async getSpots(@Query() query: SpotQueryDto, @CurrentUser() user?: RequestUser) {
    return this.spotsService.findAll(query, user?.id);
  }

  @Get('nearby')
  @Public()
  @ApiOperation({ summary: 'Get nearby spots' })
  async getNearbySpots(@Query() query: NearbyQueryDto, @CurrentUser() user?: RequestUser) {
    return this.spotsService.findNearby(query, user?.id);
  }

  @Get('favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my favorite spots' })
  async getFavorites(@CurrentUser() user: RequestUser) {
    return this.spotsService.getFavorites(user.id);
  }

  @Get(':spotId')
  @Public()
  @ApiOperation({ summary: 'Get spot detail' })
  async getSpot(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.spotsService.findById(spotId, user?.id);
  }

  @Get(':spotId/votes')
  @Public()
  @ApiOperation({ summary: 'Get spot vote distribution' })
  async getVotes(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.spotsService.getVoteDistribution(spotId, user?.id);
  }

  @Post(':spotId/vote')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote for spot condition (once per day)' })
  async vote(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @Body() voteDto: VoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.spotsService.vote(spotId, user.id, voteDto.voteType);
  }

  @Post(':spotId/favorite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add spot to favorites' })
  async addFavorite(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.spotsService.addFavorite(spotId, user.id);
  }

  @Delete(':spotId/favorite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove spot from favorites' })
  async removeFavorite(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.spotsService.removeFavorite(spotId, user.id);
  }
}
