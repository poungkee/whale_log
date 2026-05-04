/**
 * @file diary.controller.ts
 * @description 다이어리 컨트롤러 - 서핑 일지 작성/조회/수정/삭제 + 신고 API
 *
 * @endpoints
 * - POST   /diary               - 서핑 일지 작성
 * - GET    /diary               - 내 서핑 일지 목록 조회
 * - GET    /diary/public        - 공개 다이어리 목록 (비로그인 허용)
 * - GET    /diary/calendar      - 캘린더 기반 서핑 기록 조회
 * - GET    /diary/:id           - 서핑 일지 상세 조회
 * - PATCH  /diary/:id           - 서핑 일지 수정
 * - DELETE /diary/:id           - 서핑 일지 삭제
 * - POST   /diary/:id/report    - 다이어리 신고 (Phase 2D)
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
import { ReportsService } from '../community/reports/reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { DiaryQueryDto } from './dto/diary-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { ReportPostDto } from '../community/posts/dto/report-post.dto';

@ApiTags('diary')
@ApiBearerAuth()
@Controller('diary')
export class DiaryController {
  constructor(
    private readonly diaryService: DiaryService,
    /** Phase 2D: 다이어리 신고 처리 위임 */
    private readonly reportsService: ReportsService,
  ) {}

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

  @Public()
  @Get('public')
  @ApiOperation({ summary: '공개 다이어리 목록 (비로그인 허용)' })
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

  /**
   * 다이어리 신고 (Phase 2D)
   *
   * 신고자 본인은 알 수 없는 데이터:
   * - 신고된 사실은 작성자에게 알리지 않음 (보복 방지)
   * - 관리자 검토 후 RESOLVED 처분 시점에만 작성자에게 별도 알림 발송
   *
   * @param diaryId - 신고 대상 다이어리 UUID
   * @param user    - 신고자 (JWT 자동 주입)
   * @param dto     - 신고 사유 + 설명
   *
   * 응답 코드:
   * - 200: 신고 접수 완료
   * - 400: 본인 다이어리 신고 시도
   * - 403: 비공개 다이어리 신고 시도
   * - 404: 다이어리 미존재
   * - 409: 이미 PENDING 상태 신고가 있음 (중복)
   */
  @Post(':diaryId/report')
  @ApiOperation({ summary: 'Report a diary entry (Phase 2D)' })
  async reportDiary(
    @Param('diaryId', ParseUUIDPipe) diaryId: string,
    @CurrentUser() user: User,
    @Body() dto: ReportPostDto,
  ) {
    return this.reportsService.createDiaryReport(diaryId, user.id, dto);
  }
}
