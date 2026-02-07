/**
 * @file admin.controller.ts
 * @description 관리자 컨트롤러 - 관리자 전용 CRUD API (ADMIN 역할 필요)
 *
 * @endpoints
 * - POST   /admin/spots            - 스팟 생성
 * - PATCH  /admin/spots/:id        - 스팟 수정
 * - DELETE /admin/spots/:id        - 스팟 삭제
 * - POST   /admin/guides           - 가이드 생성
 * - PATCH  /admin/guides/:id       - 가이드 수정
 * - DELETE /admin/guides/:id       - 가이드 삭제
 * - POST   /admin/users/:id/suspend - 사용자 정지
 * - GET    /admin/reports           - 신고 목록 조회
 * - PATCH  /admin/reports/:id       - 신고 처리
 * - POST   /admin/broadcast         - 전체 공지 전송
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
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
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get users list' })
  async getUsers(@Query() query: PaginationDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:userId/suspend')
  @ApiOperation({ summary: 'Suspend/unsuspend user' })
  async suspendUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(userId, dto);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Change user role' })
  async changeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: Role,
  ) {
    return this.adminService.changeUserRole(userId, role);
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

  @Patch('posts/:postId/hide')
  @ApiOperation({ summary: 'Hide/unhide post' })
  async hidePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body('isHidden') isHidden: boolean,
  ) {
    return this.adminService.hidePost(postId, isHidden);
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

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Send broadcast notification to all users' })
  async broadcast(@Body() dto: BroadcastDto) {
    return this.adminService.broadcast(dto);
  }
}
