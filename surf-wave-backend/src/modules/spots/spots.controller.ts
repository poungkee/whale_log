/**
 * @file spots.controller.ts
 * @description 서핑 스팟 컨트롤러 - 해변 정보 조회, 즐겨찾기, 투표 API
 *
 * 엔드포인트:
 * - POST   /spots/seed        : 스팟 초기 시드 (ADMIN 전용 — 인증+역할 필요)
 * - GET    /spots             : 스팟 목록 조회 (지역, 난이도, 검색어 필터)
 * - GET    /spots/nearby      : 주변 스팟 검색 (위도/경도/반경 기반)
 * - GET    /spots/favorites   : 내 즐겨찾기 스팟 목록 (인증 필요)
 * - GET    /spots/:spotId     : 스팟 상세 정보 조회
 * - GET    /spots/:spotId/votes : 오늘의 투표 분포 조회
 * - POST   /spots/:spotId/vote : 스팟 컨디션 투표 (하루 1회, 인증 필요)
 * - POST   /spots/:spotId/favorite : 즐겨찾기 추가 (인증 필요)
 * - DELETE /spots/:spotId/favorite : 즐겨찾기 제거 (인증 필요)
 *
 * [보안] @Public() 데코레이터가 붙지 않은 엔드포인트는 전역 JWT 가드(FirebaseAuthGuard)가 자동 적용됩니다.
 *        시드 엔드포인트는 과거 @Public()이었으나 보안 취약점(SEC-1)으로 ADMIN 전용으로 변경되었습니다.
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
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SpotsService } from './spots.service';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SpotQueryDto } from './dto/spot-query.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('spots')
@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  /**
   * 스팟 초기 시드 엔드포인트 — spots-data.json을 DB에 upsert
   *
   * [보안] 이전에 @Public()으로 인증 없이 누구나 호출 가능했던 것을 ADMIN 전용으로 변경 (SEC-1 수정)
   *        - @Public() 제거: 전역 JWT 가드(FirebaseAuthGuard)가 Bearer 토큰을 요구
   *        - @UseGuards(RolesGuard) + @Roles(Role.ADMIN): JWT 유효 + role=ADMIN 인 경우만 실행
   *        - 일반 사용자(role=USER)는 403 Forbidden 반환
   *
   * 사용 시점: 프로덕션 첫 배포 후 관리자가 1회 호출, 이후 admin 패널의 스팟 관리로 대체 예정
   */
  @Post('seed')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '스팟 초기 데이터 시드 (ADMIN 전용)' })
  async seedSpots() {
    try {
      const dataPath = path.join(__dirname, '..', '..', 'database', 'seeds', 'spots-data.json');
      const spots = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      let count = 0;
      for (const spot of spots) {
        await this.spotsService.upsertSpot(spot);
        count++;
      }
      return { message: `${count}개 스팟 시드 완료` };
    } catch (e) {
      throw new InternalServerErrorException(`시드 실패: ${(e as Error).message}`);
    }
  }

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
