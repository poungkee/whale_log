/**
 * @file user-boards.service.ts
 * @description 내 보드 CRUD 서비스
 *
 * - 사용자별 보드 목록/추가/수정/삭제
 * - 메인 보드 변경 시 트랜잭션으로 다른 보드의 isPrimary=false 처리
 * - 첫 보드 등록 시 자동으로 isPrimary=true
 * - 메인 보드 변경 시 User.boardType / boardSizeFt 동기화
 */
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserBoard } from './entities/user-board.entity';
import { User } from '../users/entities/user.entity';
import { CreateUserBoardDto } from './dto/create-user-board.dto';
import { UpdateUserBoardDto } from './dto/update-user-board.dto';

@Injectable()
export class UserBoardsService {
  private readonly logger = new Logger(UserBoardsService.name);

  constructor(
    @InjectRepository(UserBoard)
    private readonly boardRepo: Repository<UserBoard>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly dataSource: DataSource,
  ) {}

  /** 내 보드 목록 조회 (메인 보드 우선, 그 외 생성일 오름차순) */
  async findAll(userId: string): Promise<UserBoard[]> {
    return this.boardRepo.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * 보드 등록
   * - 첫 보드면 자동으로 isPrimary=true
   * - isPrimary=true로 등록 시 다른 보드는 false 처리
   * - User.boardType / boardSizeFt 메인 보드와 동기화
   */
  async create(userId: string, dto: CreateUserBoardDto): Promise<UserBoard> {
    return this.dataSource.transaction(async (manager) => {
      const existingCount = await manager.count(UserBoard, { where: { userId } });

      /** 첫 보드면 강제로 메인 */
      const shouldBePrimary = existingCount === 0 || dto.isPrimary === true;

      /** 메인으로 지정 시 다른 보드 모두 비메인 처리 */
      if (shouldBePrimary) {
        await manager.update(UserBoard, { userId, isPrimary: true }, { isPrimary: false });
      }

      const board = manager.create(UserBoard, {
        userId,
        nickname: dto.nickname,
        boardType: dto.boardType,
        sizeFt: dto.sizeFt ?? null,
        isPrimary: shouldBePrimary,
        notes: dto.notes ?? null,
      });
      const saved = await manager.save(board);

      /** 메인 보드면 User 엔티티의 boardType/boardSizeFt 동기화 */
      if (shouldBePrimary) {
        await manager.update(User, userId, {
          boardType: dto.boardType,
          boardSizeFt: dto.sizeFt ?? null,
        });
      }

      this.logger.log(`보드 추가: userId=${userId}, board=${saved.id}, primary=${shouldBePrimary}`);
      return saved;
    });
  }

  /**
   * 보드 수정
   * - 본인 소유만 수정 가능
   * - isPrimary=true로 변경 시 다른 보드 비메인 + User 동기화
   */
  async update(userId: string, boardId: string, dto: UpdateUserBoardDto): Promise<UserBoard> {
    return this.dataSource.transaction(async (manager) => {
      const board = await manager.findOne(UserBoard, { where: { id: boardId } });
      if (!board) throw new NotFoundException('보드를 찾을 수 없습니다');
      if (board.userId !== userId) throw new ForbiddenException('본인의 보드만 수정할 수 있습니다');

      /** isPrimary=true로 승격 시 기존 메인 보드 강등 */
      if (dto.isPrimary === true && !board.isPrimary) {
        await manager.update(UserBoard, { userId, isPrimary: true }, { isPrimary: false });
      }

      Object.assign(board, {
        nickname: dto.nickname ?? board.nickname,
        boardType: dto.boardType ?? board.boardType,
        sizeFt: dto.sizeFt !== undefined ? dto.sizeFt : board.sizeFt,
        isPrimary: dto.isPrimary !== undefined ? dto.isPrimary : board.isPrimary,
        notes: dto.notes !== undefined ? dto.notes : board.notes,
      });
      const saved = await manager.save(board);

      /** 메인 보드 변경 시 User 동기화 */
      if (saved.isPrimary) {
        await manager.update(User, userId, {
          boardType: saved.boardType,
          boardSizeFt: saved.sizeFt,
        });
      }

      return saved;
    });
  }

  /**
   * 보드 삭제 (소프트 삭제)
   * - 메인 보드 삭제 시 다음 보드를 자동 메인으로 승격
   */
  async remove(userId: string, boardId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const board = await manager.findOne(UserBoard, { where: { id: boardId } });
      if (!board) throw new NotFoundException('보드를 찾을 수 없습니다');
      if (board.userId !== userId) throw new ForbiddenException('본인의 보드만 삭제할 수 있습니다');

      const wasPrimary = board.isPrimary;

      await manager.softRemove(board);
      this.logger.log(`보드 삭제: userId=${userId}, board=${boardId}`);

      /** 메인 보드를 삭제했다면 가장 오래된 다른 보드를 자동 메인 승격 */
      if (wasPrimary) {
        const next = await manager.findOne(UserBoard, {
          where: { userId },
          order: { createdAt: 'ASC' },
        });
        if (next) {
          next.isPrimary = true;
          await manager.save(next);
          await manager.update(User, userId, {
            boardType: next.boardType,
            boardSizeFt: next.sizeFt,
          });
          this.logger.log(`다음 보드 자동 승격: ${next.id}`);
        } else {
          /** 보드가 모두 삭제됐으면 User.boardType을 UNSET으로 */
          await manager.update(User, userId, {
            boardType: 'UNSET' as any,
            boardSizeFt: null,
          });
        }
      }
    });
  }
}
