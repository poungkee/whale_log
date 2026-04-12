/**
 * @file admin.controller.ts
 * @description 관리자 컨트롤러 - 관리자 전용 CRUD API (ADMIN 역할 필요)
 *
 * [보안] 모든 엔드포인트는 @Roles(Role.ADMIN)으로 보호됩니다.
 *        - 전역 JWT 가드(FirebaseAuthGuard)로 토큰 검증 후
 *        - RolesGuard에서 role=ADMIN인지 추가 확인
 *        - 일반 사용자(role=USER) 접근 시 403 Forbidden
 *
 * @endpoints
 * - GET    /admin/dashboard         - 대시보드 통계 (실제 집계, P1-1)
 * - GET    /admin/users             - 사용자 목록 (검색/필터, P1-3)
 * - PATCH  /admin/users/:id/suspend - 사용자 정지/해제
 * - PATCH  /admin/users/:id/role    - 역할 변경
 * - POST   /admin/spots             - 스팟 생성
 * - PATCH  /admin/spots/:id         - 스팟 수정
 * - DELETE /admin/spots/:id         - 스팟 삭제
 * - POST   /admin/guides            - 가이드 생성
 * - PATCH  /admin/guides/:id        - 가이드 수정
 * - DELETE /admin/guides/:id        - 가이드 삭제 (P1-2 추가)
 * - GET    /admin/reports           - 신고 목록 조회
 * - PATCH  /admin/reports/:id       - 신고 처리
 * - PATCH  /admin/posts/:id/hide    - 게시글 숨김/노출
 * - POST   /admin/notifications/broadcast - 전체 공지 전송
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
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { CreateSpotDto } from './dto/create-spot.dto';
import { UpdateSpotDto } from './dto/update-spot.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { BroadcastDto } from './dto/broadcast.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '관리자 대시보드 통계' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  /**
   * 7일 트래픽 통계 — 관리자 대시보드 차트용
   * 일별 신규 가입, DAU, 다이어리, 게시글 수 반환
   */
  @Get('stats/traffic')
  @ApiOperation({ summary: '7일 트래픽 통계 (차트용)' })
  async getTrafficStats() {
    return this.adminService.getTrafficStats();
  }

  /**
   * 사용자 목록 조회 (P1-3: 검색/필터 추가)
   *
   * 쿼리 파라미터:
   * - page, limit: 페이지네이션
   * - search: 이메일/닉네임 검색
   * - role: USER | ADMIN 필터
   * - isSuspended: true | false 필터
   *
   * 예: GET /admin/users?search=surf&isSuspended=true&page=1&limit=20
   */
  @Get('users')
  @ApiOperation({ summary: '사용자 목록 조회 (검색/필터 지원)' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  /**
   * 사용자 정지/해제 (P1-6: req.user.sub + IP를 서비스에 전달해 감사 로그 기록)
   */
  @Patch('users/:userId/suspend')
  @ApiOperation({ summary: '사용자 정지/해제' })
  async suspendUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SuspendUserDto,
    @Request() req: any,
    @Ip() ip: string,
  ) {
    return this.adminService.suspendUser(req.user.sub, userId, dto, ip);
  }

  /**
   * 역할 변경 (P1-6: req.user.sub + IP를 서비스에 전달해 감사 로그 기록)
   */
  @Patch('users/:userId/role')
  @ApiOperation({ summary: '사용자 역할 변경' })
  async changeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: Role,
    @Request() req: any,
    @Ip() ip: string,
  ) {
    return this.adminService.changeUserRole(req.user.sub, userId, role, ip);
  }

  @Post('spots')
  @ApiOperation({ summary: 'Create new spot' })
  async createSpot(@Body() dto: CreateSpotDto) {
    return this.adminService.createSpot(dto);
  }

  @Patch('spots/:spotId')
  @ApiOperation({ summary: 'Update spot' })
  async updateSpot(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @Body() dto: UpdateSpotDto,
  ) {
    return this.adminService.updateSpot(spotId, dto);
  }

  @Delete('spots/:spotId')
  @ApiOperation({ summary: 'Delete spot' })
  async deleteSpot(@Param('spotId', ParseUUIDPipe) spotId: string) {
    return this.adminService.deleteSpot(spotId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get reports list' })
  async getReports(@Query() query: PaginationDto) {
    return this.adminService.getReports(query);
  }

  @Patch('reports/:reportId')
  @ApiOperation({ summary: 'Resolve report' })
  async resolveReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.adminService.resolveReport(reportId, dto);
  }

  /**
   * 게시글 숨김/노출 (P1-6: 감사 로그 기록)
   */
  @Patch('posts/:postId/hide')
  @ApiOperation({ summary: '게시글 숨김/노출' })
  async hidePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body('isHidden') isHidden: boolean,
    @Request() req: any,
    @Ip() ip: string,
  ) {
    return this.adminService.hidePost(req.user.sub, postId, isHidden, ip);
  }

  @Post('guides')
  @ApiOperation({ summary: 'Create new guide' })
  async createGuide(@Body() dto: CreateGuideDto) {
    return this.adminService.createGuide(dto);
  }

  @Patch('guides/:guideId')
  @ApiOperation({ summary: 'Update guide' })
  async updateGuide(
    @Param('guideId', ParseUUIDPipe) guideId: string,
    @Body() dto: UpdateGuideDto,
  ) {
    return this.adminService.updateGuide(guideId, dto);
  }

  /**
   * 가이드 삭제 (P1-2: 기존에 컨트롤러 선언은 있었으나 서비스 구현 누락됐던 항목)
   *
   * 가이드는 관리자 콘텐츠이므로 하드 삭제(완전 삭제) 처리
   * 삭제 후 복구 불가 — 실수 방지를 위해 프론트에서 확인 모달 필요
   */
  @Delete('guides/:guideId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '가이드 삭제 (하드 삭제)' })
  async deleteGuide(@Param('guideId', ParseUUIDPipe) guideId: string) {
    return this.adminService.deleteGuide(guideId);
  }

  /**
   * 감사 로그 목록 조회 — 관리자 액션 이력
   * 최신순 정렬, 페이지네이션 지원
   */
  @Get('logs')
  @ApiOperation({ summary: '감사 로그 목록 조회' })
  async getLogs(@Query() query: PaginationDto) {
    return this.adminService.getLogs(query);
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Send broadcast notification to all users' })
  async broadcast(@Body() dto: BroadcastDto) {
    return this.adminService.broadcast(dto);
  }
}
