/**
 * @file reports.service.ts
 * @description 신고 서비스 - 콘텐츠 신고 접수 비즈니스 로직
 *
 * 신고 대상:
 * - 게시글(posts) — createPostReport
 * - 댓글(comments) — createCommentReport
 * - 다이어리(surf_diaries) — createDiaryReport (Phase 2D 추가)
 *
 * 공통 정책:
 * - 인증된 사용자만 신고 가능 (JWT 가드에서 처리)
 * - 본인 콘텐츠 신고 차단 (자기 자신 신고 불가)
 * - 동일 사용자가 동일 콘텐츠에 PENDING 상태 신고 1건만 (중복 방지)
 * - 비공개 콘텐츠 신고 불가 (본인만 보는 컨텐츠를 다른 사람이 신고할 수 없음)
 */
import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { ReportPostDto } from '../posts/dto/report-post.dto';
import { ReportStatus } from '../../../common/enums/report-status.enum';
import { SurfDiary } from '../../diary/entities/surf-diary.entity';
import { Visibility } from '../../../common/enums/visibility.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    /** Phase 2D: 다이어리 신고 시 대상 존재/소유/공개여부 검증용 */
    @InjectRepository(SurfDiary)
    private readonly diaryRepository: Repository<SurfDiary>,
  ) {}

  /**
   * 게시글 신고 접수
   *
   * 방어 로직:
   * - 동일 사용자의 PENDING 중복 신고 차단 (409 Conflict)
   *
   * @param postId   - 신고 대상 게시글 UUID
   * @param userId   - 신고자 UUID (JWT sub)
   * @param dto      - 신고 사유 + 설명
   */
  async createPostReport(postId: string, userId: string, dto: ReportPostDto) {
    /** 중복 신고 방지 — 동일 사용자가 동일 게시글에 대기 중인 신고가 있으면 거부 */
    const existing = await this.reportRepository.findOne({
      where: { postId, reporterId: userId, status: ReportStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException('이미 신고 접수된 게시글입니다');
    }

    const report = this.reportRepository.create({
      reporterId: userId,
      postId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });
    await this.reportRepository.save(report);
    return { message: '신고가 접수되었습니다' };
  }

  /**
   * 댓글 신고 접수
   *
   * 방어 로직:
   * - 동일 사용자의 PENDING 중복 신고 차단 (409 Conflict)
   *
   * @param commentId - 신고 대상 댓글 UUID
   * @param userId    - 신고자 UUID
   * @param dto       - 신고 사유 + 설명
   */
  async createCommentReport(
    commentId: string,
    userId: string,
    dto: ReportPostDto,
  ) {
    const existing = await this.reportRepository.findOne({
      where: { commentId, reporterId: userId, status: ReportStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException('이미 신고 접수된 댓글입니다');
    }

    const report = this.reportRepository.create({
      reporterId: userId,
      commentId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });
    await this.reportRepository.save(report);
    return { message: '신고가 접수되었습니다' };
  }

  /**
   * 다이어리 신고 접수 (Phase 2D 신규)
   *
   * 시나리오:
   * - 사용자 A가 사용자 B의 공개 다이어리를 부적절하다고 판단하여 신고
   * - 신고 접수 시 B에게는 알림 X (보복 방지) — 관리자 처분 시점에만 알림 발송
   *
   * 방어 로직 (시나리오 B-2 ~ B-5):
   * - B-2: 다이어리 미존재 → 404 Not Found
   * - B-3: 본인 다이어리 신고 차단 → 400 Bad Request
   * - B-4: 비공개(PRIVATE/FRIENDS) 다이어리 신고 차단 → 403 Forbidden
   * - B-5: PENDING 중복 신고 차단 → 409 Conflict
   *
   * @param diaryId - 신고 대상 다이어리 UUID
   * @param userId  - 신고자 UUID (JWT sub)
   * @param dto     - 신고 사유 + 설명
   */
  async createDiaryReport(diaryId: string, userId: string, dto: ReportPostDto) {
    /** ① 다이어리 존재 확인 */
    const diary = await this.diaryRepository.findOne({
      where: { id: diaryId },
      select: ['id', 'userId', 'visibility', 'isHidden'],
    });
    if (!diary) {
      throw new NotFoundException('다이어리를 찾을 수 없습니다');
    }

    /** ② 본인 다이어리 신고 차단 (B-3) */
    if (diary.userId === userId) {
      throw new BadRequestException('본인의 다이어리는 신고할 수 없습니다');
    }

    /** ③ 비공개 다이어리 신고 차단 (B-4) — 공개된 컨텐츠만 신고 대상 */
    if (diary.visibility !== Visibility.PUBLIC) {
      throw new ForbiddenException('비공개 다이어리는 신고할 수 없습니다');
    }

    /** ④ 중복 신고 차단 (B-5) — PENDING 1건만 허용 */
    const existing = await this.reportRepository.findOne({
      where: { diaryId, reporterId: userId, status: ReportStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException('이미 신고 접수된 다이어리입니다');
    }

    /** ⑤ 신고 저장 */
    const report = this.reportRepository.create({
      reporterId: userId,
      diaryId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });
    await this.reportRepository.save(report);
    return { message: '신고가 접수되었습니다' };
  }
}
