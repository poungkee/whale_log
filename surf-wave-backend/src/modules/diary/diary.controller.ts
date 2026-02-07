/**
 * @file diary.controller.ts
 * @description 다이어리 컨트롤러 - 서핑 일지 작성/조회/수정/삭제 API
 *
 * @endpoints
 * - POST   /diary         - 서핑 일지 작성
 * - GET    /diary         - 서핑 일지 목록 조회
 * - GET    /diary/calendar - 캘린더 기반 서핑 기록 조회
 * - GET    /diary/:id     - 서핑 일지 상세 조회
 * - PATCH  /diary/:id     - 서핑 일지 수정
 * - DELETE /diary/:id     - 서핑 일지 삭제
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DiaryService } from './diary.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { DiaryQueryDto } from './dto/diary-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@ApiTags('diary')
@ApiBearerAuth()
@Controller('diary')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Get()
  @ApiOperation({ summary: 'Get my diary entries' })
  async getMyDiaries(@CurrentUser() user: User, @Query() query: DiaryQueryDto) {
    return this.diaryService.findByUser(user.id, query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get diary entries for calendar view' })
  async getCalendar(@CurrentUser() user: User, @Query() query: CalendarQueryDto) {
    return this.diaryService.getCalendar(user.id, query);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public diary entries' })
  async getPublicDiaries(@Query() query: DiaryQueryDto) {
    return this.diaryService.findPublic(query);
  }

  @Get(':diaryId')
  @ApiOperation({ summary: 'Get diary entry detail' })
  async getDiary(
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
    @CurrentUser() user: User,
  ) {
    return this.diaryService.findById(diaryId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new diary entry' })
  async createDiary(@CurrentUser() user: User, @Body() createDiaryDto: CreateDiaryDto) {
    return this.diaryService.create(user.id, createDiaryDto);
  }

  @Patch(':diaryId')
  @ApiOperation({ summary: 'Update diary entry' })
  async updateDiary(
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
    @CurrentUser() user: User,
    @Body() updateDiaryDto: UpdateDiaryDto,
  ) {
    return this.diaryService.update(diaryId, user.id, updateDiaryDto);
  }

  @Delete(':diaryId')
  @ApiOperation({ summary: 'Delete diary entry' })
  async deleteDiary(
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
    @CurrentUser() user: User,
  ) {
    return this.diaryService.delete(diaryId, user.id);
  }
}
