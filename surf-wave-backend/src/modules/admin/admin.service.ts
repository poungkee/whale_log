/**
 * @file admin.service.ts
 * @description 관리자 서비스 - 관리 기능 비즈니스 로직
 *
 * @methods
 * - getDashboardStats: 대시보드 통계 집계 (실제 DB 집계, P1-1 수정)
 * - getUsers: 사용자 목록 조회 (검색/필터 지원, P1-3 수정)
 * - suspendUser: 사용자 정지/해제
 * - changeUserRole: 사용자 역할 변경
 * - createSpot: 스팟 생성
 * - updateSpot: 스팟 수정
 * - deleteSpot: 스팟 삭제
 * - getReports: 신고 목록 조회
 * - resolveReport: 신고 처리
 * - hidePost: 게시글 숨김/노출
 * - createGuide: 가이드 생성
 * - updateGuide: 가이드 수정
 * - deleteGuide: 가이드 삭제 (P1-2 추가)
 * - broadcast: 전체 공지 전송
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, MoreThanOrEqual, ILike } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Spot } from '../spots/entities/spot.entity';
import { Post } from '../community/posts/entities/post.entity';
import { Report } from '../community/reports/entities/report.entity';
import { Guide } from '../guides/entities/guide.entity';
import { SurfDiary } from '../diary/entities/surf-diary.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { Role } from '../../common/enums/role.enum';
import { ReportStatus } from '../../common/enums/report-status.enum';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { AdminLog, AdminActionType, AdminTargetType } from './entities/admin-log.entity';
import { CreateSpotDto } from './dto/create-spot.dto';
import { UpdateSpotDto } from './dto/update-spot.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { BroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Spot)
    private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Guide)
    private readonly guideRepository: Repository<Guide>,
    /** 다이어리 집계용 레포지토리 (P1-1: 대시보드 통계 실제 집계) */
    @InjectRepository(SurfDiary)
    private readonly diaryRepository: Repository<SurfDiary>,
    /** 감사 로그 레포지토리 (P1-6: 관리자 액션 이력 기록) */
    @InjectRepository(AdminLog)
    private readonly adminLogRepository: Repository<AdminLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 관리자 감사 로그 기록 헬퍼 (P1-6 추가)
   *
   * 모든 주요 관리 액션 수행 후 이 메서드를 호출하여 감사 이력을 남깁니다.
   * 로그 기록 실패가 본 액션을 실패시키지 않도록 try/catch로 처리합니다.
   *
   * @param adminId - 액션을 수행한 관리자 UUID (req.user.sub)
   * @param actionType - 수행한 액션 유형 (AdminActionType enum)
   * @param targetType - 대상 리소스 유형 (AdminTargetType enum)
   * @param targetId - 대상 리소스 UUID (없으면 null)
   * @param description - 사람이 읽을 수 있는 설명
   * @param metadata - 추가 컨텍스트 (변경 전/후 값 등)
   * @param ipAddress - 관리자 IP 주소
   */
  private async writeLog(
    adminId: string,
    actionType: AdminActionType,
    targetType: AdminTargetType | null,
    targetId: string | null,
    description: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const log = this.adminLogRepository.create({
        adminId,
        actionType,
        targetType,
        targetId,
        description,
        metadata: metadata ?? null,
        ipAddress: ipAddress ?? null,
      });
      await this.adminLogRepository.save(log);
    } catch (err) {
      /** 로그 저장 실패는 본 액션에 영향을 주지 않음 — 경고 로그만 출력 */
      console.warn(`[AdminLog] 감사 로그 저장 실패: ${(err as Error).message}`);
    }
  }

  /**
   * 대시보드 통계 집계 (P1-1 수정: 하드코딩 0 → 실제 DB 집계)
   *
   * 집계 항목:
   * - totalUsers: 전체 사용자 수 (탈퇴 제외)
   * - newUsersThisWeek: 최근 7일 신규 가입자 수
   * - activeUsersToday: 오늘 로그인한 사용자 수 (lastLoginAt 기준)
   * - totalSpots: 활성 스팟 수 (isActive=true)
   * - totalPosts: 숨김 처리되지 않은 게시글 수
   * - totalDiaries: 전체 다이어리 수
   * - pendingReports: 미처리 신고 수
   * - suspendedUsers: 현재 정지된 사용자 수
   *
   * 성능: Promise.all로 병렬 집계하여 지연 시간 최소화
   */
  async getDashboardStats() {
    /** 오늘 자정(00:00:00) 기준 날짜 — 오늘 로그인 집계에 사용 */
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    /** 7일 전 날짜 — 신규 가입자 집계에 사용 */
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    /** 모든 통계를 병렬로 집계 (순차 처리 대비 응답 속도 개선) */
    const [
      totalUsers,
      newUsersThisWeek,
      activeUsersToday,
      suspendedUsers,
      totalSpots,
      totalPosts,
      totalDiaries,
      pendingReports,
    ] = await Promise.all([
      /** 전체 사용자 수 (소프트 삭제된 사용자 제외 — TypeORM 기본 동작) */
      this.userRepository.count(),

      /** 최근 7일 신규 가입자 수 (createdAt >= 7일 전) */
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(weekAgo) },
      }),

      /** 오늘 로그인한 사용자 수 (lastLoginAt >= 오늘 자정) */
      this.userRepository.count({
        where: { lastLoginAt: MoreThanOrEqual(todayStart) },
      }),

      /** 현재 정지된 사용자 수 */
      this.userRepository.count({
        where: { isSuspended: true },
      }),

      /** 활성 스팟 수 */
      this.spotRepository.count({ where: { isActive: true } }),

      /** 숨김 처리되지 않은 게시글 수 */
      this.postRepository.count({ where: { isHidden: false } }),

      /** 전체 다이어리 수 */
      this.diaryRepository.count(),

      /** 미처리(PENDING) 신고 수 */
      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
    ]);

    return {
      /** 사용자 통계 */
      totalUsers,
      newUsersThisWeek,
      activeUsersToday,
      suspendedUsers,
      /** 콘텐츠 통계 */
      totalSpots,
      totalPosts,
      totalDiaries,
      /** 관리 현황 */
      pendingReports,
    };
  }

  /**
   * 사용자 목록 조회 (P1-3 수정: 검색/필터 파라미터 추가)
   *
   * 기존: PaginationDto만 지원 (페이지네이션만)
   * 변경: UserQueryDto로 교체 — search/role/isSuspended 필터 추가
   *
   * 검색 방식:
   * - search가 있으면 이메일 OR 닉네임에서 ILIKE(대소문자 무시 부분 일치) 조회
   * - TypeORM QueryBuilder 사용 (복합 OR 조건 처리)
   *
   * @param query - 페이지네이션 + 검색/필터 파라미터
   */
  async getUsers(query: UserQueryDto) {
    const { page = 1, limit = 20, search, role, isSuspended } = query;

    /** QueryBuilder로 동적 WHERE 조건 구성 */
    const qb = this.userRepository.createQueryBuilder('user');

    if (search) {
      /**
       * 이메일 또는 닉네임에서 검색어 부분 일치
       * ILIKE: PostgreSQL 대소문자 무시 LIKE ('%검색어%')
       */
      qb.andWhere(
        '(user.email ILIKE :search OR user.nickname ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      /** 특정 역할(USER | ADMIN)만 필터 */
      qb.andWhere('user.role = :role', { role });
    }

    if (isSuspended !== undefined) {
      /** 정지 여부 필터 (true: 정지된 계정만, false: 정상 계정만) */
      qb.andWhere('user.isSuspended = :isSuspended', { isSuspended });
    }

    /** 최신 가입 순 정렬 + 페이지네이션 */
    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        role: u.role,
        isSuspended: u.isSuspended,
        suspendedUntil: u.suspendedUntil,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 사용자 정지/해제 (P1-6: 감사 로그 기록 추가)
   *
   * @param adminId - 액션을 수행하는 관리자 UUID (감사 로그용)
   * @param userId - 정지/해제할 사용자 UUID
   * @param dto - 정지 여부 + 정지 만료 시각
   * @param ipAddress - 관리자 IP 주소 (감사 로그용)
   */
  async suspendUser(adminId: string, userId: string, dto: SuspendUserDto, ipAddress?: string) {
    const target = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nickname'],
    });

    await this.userRepository.update(userId, {
      isSuspended: dto.isSuspended,
      suspendedUntil: dto.suspendedUntil ? new Date(dto.suspendedUntil) : null,
    });

    /** 감사 로그 기록 — 누가 언제 어떤 사용자를 정지/해제했는지 */
    await this.writeLog(
      adminId,
      dto.isSuspended ? AdminActionType.SUSPEND_USER : AdminActionType.UNSUSPEND_USER,
      AdminTargetType.USER,
      userId,
      dto.isSuspended
        ? `사용자 ${target?.email ?? userId} 정지 (만료: ${dto.suspendedUntil ?? '영구'})`
        : `사용자 ${target?.email ?? userId} 정지 해제`,
      { suspendedUntil: dto.suspendedUntil ?? null },
      ipAddress,
    );

    return { message: dto.isSuspended ? '계정이 정지되었습니다' : '정지가 해제되었습니다' };
  }

  /**
   * 사용자 역할 변경 (P1-6: 감사 로그 기록 추가)
   *
   * @param adminId - 액션을 수행하는 관리자 UUID (감사 로그용)
   * @param userId - 역할을 변경할 사용자 UUID
   * @param role - 새로운 역할 (USER | ADMIN)
   * @param ipAddress - 관리자 IP 주소 (감사 로그용)
   */
  async changeUserRole(adminId: string, userId: string, role: Role, ipAddress?: string) {
    const target = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role'],
    });

    await this.userRepository.update(userId, { role });

    /** 감사 로그: 역할 변경 전/후 값 기록 */
    await this.writeLog(
      adminId,
      AdminActionType.CHANGE_ROLE,
      AdminTargetType.USER,
      userId,
      `사용자 ${target?.email ?? userId} 역할 변경: ${target?.role ?? '?'} → ${role}`,
      { previousRole: target?.role, newRole: role },
      ipAddress,
    );

    return { message: '역할이 변경되었습니다' };
  }

  async createSpot(dto: CreateSpotDto) {
    const spot = this.spotRepository.create(dto);
    return this.spotRepository.save(spot);
  }

  async updateSpot(spotId: string, dto: UpdateSpotDto) {
    const spot = await this.spotRepository.findOne({ where: { id: spotId } });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }
    Object.assign(spot, dto);
    return this.spotRepository.save(spot);
  }

  async deleteSpot(spotId: string) {
    await this.spotRepository.softDelete(spotId);
    return { message: 'Spot deleted' };
  }

  async getReports(query: PaginationDto) {
    const { page = 1, limit = 20 } = query;

    const [reports, total] = await this.reportRepository.findAndCount({
      relations: ['reporter', 'post', 'comment'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: reports,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReport(reportId: string, dto: ResolveReportDto) {
    await this.reportRepository.update(reportId, {
      status: dto.status,
      adminNote: dto.adminNote,
      resolvedAt: new Date(),
    });
    return { message: 'Report resolved' };
  }

  /**
   * 게시글 숨김/노출 처리 (P1-6: 감사 로그 기록 추가)
   *
   * @param adminId - 액션을 수행하는 관리자 UUID
   * @param postId - 숨김/노출할 게시글 UUID
   * @param isHidden - true: 숨김, false: 노출
   * @param ipAddress - 관리자 IP 주소
   */
  async hidePost(adminId: string, postId: string, isHidden: boolean, ipAddress?: string) {
    await this.postRepository.update(postId, { isHidden });

    /** 감사 로그 기록 */
    await this.writeLog(
      adminId,
      isHidden ? AdminActionType.HIDE_POST : AdminActionType.SHOW_POST,
      AdminTargetType.POST,
      postId,
      `게시글 ${postId} ${isHidden ? '숨김' : '노출'} 처리`,
      undefined,
      ipAddress,
    );

    return { message: isHidden ? '게시글이 숨김 처리되었습니다' : '게시글이 노출되었습니다' };
  }

  async createGuide(dto: CreateGuideDto) {
    const guide = this.guideRepository.create(dto);
    return this.guideRepository.save(guide);
  }

  async updateGuide(guideId: string, dto: UpdateGuideDto) {
    const guide = await this.guideRepository.findOne({ where: { id: guideId } });
    if (!guide) {
      throw new NotFoundException('Guide not found');
    }
    Object.assign(guide, dto);
    return this.guideRepository.save(guide);
  }

  /**
   * 7일 트래픽 통계 조회 (관리자 대시보드 차트용)
   *
   * 최근 7일간 일별로 집계:
   * - 신규 가입자 수 (users.created_at 기준)
   * - 일별 활성 사용자 수 - DAU (users.last_login_at 기준)
   * - 신규 다이어리 수 (surf_diaries.created_at 기준)
   * - 신규 게시글 수 (posts.created_at 기준)
   *
   * PostgreSQL DATE_TRUNC + QueryBuilder로 일별 집계 수행
   * 데이터 없는 날짜는 0으로 채워서 항상 7개 항목 반환
   *
   * @returns 최근 7일 일별 통계 배열 (오래된 날 → 오늘 순)
   */
  async getTrafficStats(): Promise<{
    date: string;         // 'YYYY-MM-DD' 형식
    newUsers: number;     // 신규 가입자
    activeUsers: number;  // 일별 활성 사용자 (DAU)
    newDiaries: number;   // 신규 다이어리
    newPosts: number;     // 신규 게시글
  }[]> {
    /** 오늘부터 7일 전까지의 날짜 배열 생성 (오래된 날 → 오늘 순) */
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]); // 'YYYY-MM-DD'
    }

    /** 7일 전 시작 시각 */
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    /** PostgreSQL DATE_TRUNC('day', created_at)으로 일별 신규 가입자 집계 */
    const newUsersRaw = await this.userRepository
      .createQueryBuilder('u')
      .select("TO_CHAR(DATE_TRUNC('day', u.created_at), 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.created_at >= :start', { start: sevenDaysAgo })
      .groupBy("DATE_TRUNC('day', u.created_at)")
      .orderBy("DATE_TRUNC('day', u.created_at)", 'ASC')
      .getRawMany();

    /** 일별 활성 사용자 집계 (last_login_at 기준 — 오늘 로그인한 사람) */
    const activeUsersRaw = await this.userRepository
      .createQueryBuilder('u')
      .select("TO_CHAR(DATE_TRUNC('day', u.last_login_at), 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.last_login_at >= :start', { start: sevenDaysAgo })
      .andWhere('u.last_login_at IS NOT NULL')
      .groupBy("DATE_TRUNC('day', u.last_login_at)")
      .orderBy("DATE_TRUNC('day', u.last_login_at)", 'ASC')
      .getRawMany();

    /** 일별 신규 다이어리 집계 */
    const newDiariesRaw = await this.diaryRepository
      .createQueryBuilder('d')
      .select("TO_CHAR(DATE_TRUNC('day', d.created_at), 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('d.created_at >= :start', { start: sevenDaysAgo })
      .groupBy("DATE_TRUNC('day', d.created_at)")
      .orderBy("DATE_TRUNC('day', d.created_at)", 'ASC')
      .getRawMany();

    /** 일별 신규 게시글 집계 */
    const newPostsRaw = await this.postRepository
      .createQueryBuilder('p')
      .select("TO_CHAR(DATE_TRUNC('day', p.created_at), 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('p.created_at >= :start', { start: sevenDaysAgo })
      .andWhere('p.is_hidden = false')
      .groupBy("DATE_TRUNC('day', p.created_at)")
      .orderBy("DATE_TRUNC('day', p.created_at)", 'ASC')
      .getRawMany();

    /** raw 배열을 date → count Map으로 변환 (없는 날짜는 0으로 처리) */
    const toMap = (raw: { date: string; count: string }[]) =>
      new Map(raw.map(r => [r.date, Number(r.count)]));

    const newUsersMap   = toMap(newUsersRaw);
    const activeMap     = toMap(activeUsersRaw);
    const diariesMap    = toMap(newDiariesRaw);
    const postsMap      = toMap(newPostsRaw);

    /** 7일치 날짜를 순회하며 없는 날짜는 0으로 채워서 반환 */
    return days.map(date => ({
      date,
      newUsers:    newUsersMap.get(date)   ?? 0,
      activeUsers: activeMap.get(date)     ?? 0,
      newDiaries:  diariesMap.get(date)    ?? 0,
      newPosts:    postsMap.get(date)      ?? 0,
    }));
  }

  /**
   * 가이드 삭제 (P1-2 추가: 컨트롤러에 선언됐으나 서비스에 구현이 없던 메서드)
   *
   * 소프트 삭제(softDelete)가 아닌 하드 삭제로 처리합니다.
   * 가이드는 사용자 데이터가 아닌 관리자 콘텐츠이므로 완전 삭제가 적합합니다.
   *
   * @param guideId - 삭제할 가이드 UUID
   */
  async deleteGuide(guideId: string) {
    const guide = await this.guideRepository.findOne({ where: { id: guideId } });
    if (!guide) {
      throw new NotFoundException('가이드를 찾을 수 없습니다');
    }
    await this.guideRepository.remove(guide);
    return { message: '가이드가 삭제되었습니다' };
  }

  /**
   * 감사 로그 목록 조회
   * 최신순 정렬, 페이지네이션 지원
   * 관리자 정보 join 포함 (닉네임, 이메일)
   */
  async getLogs(query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.adminLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['admin'],
    });

    return { data, total, page, limit };
  }

  async broadcast(dto: BroadcastDto) {
    const users = await this.userRepository.find({
      where: { notificationsEnabled: true, fcmToken: Not(IsNull()) },
      select: ['id'],
    });

    // Create notifications for all users
    await Promise.all(
      users.map((user) =>
        this.notificationsService.createNotification(
          user.id,
          NotificationType.BROADCAST,
          dto.title,
          dto.body,
          dto.data,
        ),
      ),
    );

    return { message: `Broadcast sent to ${users.length} users` };
  }
}
