/**
 * @file diary-interactions.service.ts
 * @description 다이어리 댓글 + 도움됐어요 서비스
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiaryComment } from './entities/diary-comment.entity';
import { DiaryHelpful } from './entities/diary-helpful.entity';

@Injectable()
export class DiaryInteractionsService {
  private readonly logger = new Logger(DiaryInteractionsService.name);

  constructor(
    @InjectRepository(DiaryComment)
    private readonly commentRepo: Repository<DiaryComment>,
    @InjectRepository(DiaryHelpful)
    private readonly helpfulRepo: Repository<DiaryHelpful>,
  ) {}

  // ─── 댓글 ───────────────────────────────────────────────

  /** 다이어리의 댓글 목록 (최신순, 대댓글 포함) */
  async getComments(diaryId: string) {
    return this.commentRepo.find({
      where: { diaryId },
      order: { createdAt: 'ASC' },
      relations: ['author'],
    });
  }

  /** 댓글 작성 — depth 1로 제한 */
  async createComment(
    userId: string,
    diaryId: string,
    content: string,
    parentId?: string,
  ) {
    let depth = 0;
    if (parentId) {
      const parent = await this.commentRepo.findOne({ where: { id: parentId } });
      if (!parent) throw new NotFoundException('부모 댓글을 찾을 수 없습니다');
      if (parent.diaryId !== diaryId) throw new BadRequestException('다른 다이어리의 댓글입니다');
      if (parent.depth >= 1) throw new BadRequestException('대댓글에는 답글을 달 수 없습니다');
      depth = parent.depth + 1;
    }
    const comment = this.commentRepo.create({
      diaryId,
      authorId: userId,
      content: content.trim(),
      parentId: parentId ?? null,
      depth,
    });
    return this.commentRepo.save(comment);
  }

  /** 댓글 수정 — 본인만 */
  async updateComment(userId: string, commentId: string, content: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('본인 댓글만 수정할 수 있습니다');
    }
    comment.content = content.trim();
    return this.commentRepo.save(comment);
  }

  /** 댓글 삭제 — 본인만 (소프트 삭제) */
  async deleteComment(userId: string, commentId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('본인 댓글만 삭제할 수 있습니다');
    }
    await this.commentRepo.softRemove(comment);
    return { ok: true };
  }

  // ─── 도움됐어요 ──────────────────────────────────────────

  /** 다이어리의 도움됐어요 카운트 + 본인 누름 여부 */
  async getHelpfulStatus(userId: string, diaryId: string) {
    const count = await this.helpfulRepo.count({ where: { diaryId } });
    const own = userId
      ? await this.helpfulRepo.findOne({ where: { userId, diaryId } })
      : null;
    return { count, helpful: !!own };
  }

  /** 도움됐어요 토글 */
  async toggleHelpful(userId: string, diaryId: string) {
    const existing = await this.helpfulRepo.findOne({ where: { userId, diaryId } });
    if (existing) {
      await this.helpfulRepo.remove(existing);
      const count = await this.helpfulRepo.count({ where: { diaryId } });
      return { helpful: false, count };
    }
    await this.helpfulRepo.save(this.helpfulRepo.create({ userId, diaryId }));
    const count = await this.helpfulRepo.count({ where: { diaryId } });
    return { helpful: true, count };
  }
}
