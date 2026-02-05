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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SpotQueryDto } from './dto/spot-query.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('spots')
@ApiBearerAuth()
@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get spots list with filters' })
  async getSpots(@Query() query: SpotQueryDto, @CurrentUser() user: User) {
    return this.spotsService.findAll(query, user.id);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby spots' })
  async getNearbySpots(@Query() query: NearbyQueryDto, @CurrentUser() user: User) {
    return this.spotsService.findNearby(query, user.id);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get my favorite spots' })
  async getFavorites(@CurrentUser() user: User) {
    return this.spotsService.getFavorites(user.id);
  }

  @Get(':spotId')
  @ApiOperation({ summary: 'Get spot detail' })
  async getSpot(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user: User,
  ) {
    return this.spotsService.findById(spotId, user.id);
  }

  @Get(':spotId/votes')
  @ApiOperation({ summary: 'Get spot vote distribution' })
  async getVotes(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user: User,
  ) {
    return this.spotsService.getVoteDistribution(spotId, user.id);
  }

  @Post(':spotId/vote')
  @ApiOperation({ summary: 'Vote for spot condition (once per day)' })
  async vote(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @Body() voteDto: VoteDto,
    @CurrentUser() user: User,
  ) {
    return this.spotsService.vote(spotId, user.id, voteDto.voteType);
  }

  @Post(':spotId/favorite')
  @ApiOperation({ summary: 'Add spot to favorites' })
  async addFavorite(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user: User,
  ) {
    return this.spotsService.addFavorite(spotId, user.id);
  }

  @Delete(':spotId/favorite')
  @ApiOperation({ summary: 'Remove spot from favorites' })
  async removeFavorite(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @CurrentUser() user: User,
  ) {
    return this.spotsService.removeFavorite(spotId, user.id);
  }
}
