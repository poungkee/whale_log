/**
 * @file diary.service.ts
 * @description 다이어리 서비스 - 서핑 일지 CRUD 비즈니스 로직
 *
 * @methods
 * - create: 서핑 일지 작성
 * - findAll: 일지 목록 조회 (페이지네이션)
 * - findOne: 일지 상세 조회
 * - update: 일지 수정
 * - remove: 일지 삭제
 * - getCalendar: 캘린더 기반 서핑 기록 조회
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SurfDiary } from './entities/surf-diary.entity';
import { DiaryImage } from './entities/diary-image.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { DiaryQueryDto } from './dto/diary-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { Visibility } from '../../common/enums/visibility.enum';
import { getMonthRange } from '../../common/utils/date.util';

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(SurfDiary)
    private readonly diaryRepository: Repository<SurfDiary>,
    @InjectRepository(DiaryImage)
    private readonly imageRepository: Repository<DiaryImage>,
  ) {}

  async findByUser(userId: string, query: DiaryQueryDto) {
    const { spotId, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.diaryRepository
      .createQueryBuilder('diary')
      .leftJoinAndSelect('diary.images', 'images')
      .leftJoinAndSelect('diary.spot', 'spot')
      .where('diary.userId = :userId', { userId });

    if (spotId) {
      qb.andWhere('diary.spotId = :spotId', { spotId });
    }
    if (startDate) {
      qb.andWhere('diary.surfDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('diary.surfDate <= :endDate', { endDate });
    }

    const [diaries, total] = await qb
      .orderBy('diary.surfDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: diaries,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async getCalendar(userId: string, query: CalendarQueryDto) {
    const { year, month } = query;
    const { start, end } = getMonthRange(year, month);

    const diaries = await this.diaryRepository
      .createQueryBuilder('diary')
      .leftJoinAndSelect('diary.spot', 'spot')
      .where('diary.userId = :userId', { userId })
      .andWhere('diary.surfDate BETWEEN :start AND :end', { start, end })
      .getMany();

    // Group by date
    const grouped = new Map<string, { count: number; spotNames: string[] }>();

    diaries.forEach((diary) => {
      const dateStr = diary.surfDate.toString();
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, { count: 0, spotNames: [] });
      }
      const entry = grouped.get(dateStr)!;
      entry.count++;
      if (diary.spot && !entry.spotNames.includes(diary.spot.name)) {
        entry.spotNames.push(diary.spot.name);
      }
    });

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  async findPublic(query: DiaryQueryDto) {
    const { page = 1, limit = 20 } = query;

    const [diaries, total] = await this.diaryRepository.findAndCount({
      where: { visibility: Visibility.PUBLIC },
      relations: ['images', 'spot', 'user'],
      order: { surfDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: diaries.map((d) => ({
        ...d,
        user: { id: d.user.id, nickname: d.user.nickname, avatarUrl: d.user.avatarUrl },
      })),
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async findById(diaryId: string, userId: string) {
    const diary = await this.diaryRepository.findOne({
      where: { id: diaryId },
      relations: ['images', 'spot'],
    });

    if (!diary) {
      throw new NotFoundException('Diary not found');
    }

    if (diary.userId !== userId && diary.visibility !== Visibility.PUBLIC) {
      throw new ForbiddenException('Access denied');
    }

    return diary;
  }

  async create(userId: string, dto: CreateDiaryDto) {
    const diary = this.diaryRepository.create({
      userId,
      spotId: dto.spotId,
      surfDate: dto.surfDate,
      boardType: dto.boardType,
      durationMinutes: dto.durationMinutes,
      satisfaction: dto.satisfaction,
      memo: dto.memo,
      visibility: dto.visibility || Visibility.PRIVATE,
    });

    const savedDiary = await this.diaryRepository.save(diary);

    // Save images
    if (dto.imageUrls?.length) {
      const images = dto.imageUrls.map((url, index) =>
        this.imageRepository.create({
          diaryId: savedDiary.id,
          imageUrl: url,
          sortOrder: index,
        }),
      );
      await this.imageRepository.save(images);
    }

    return this.findById(savedDiary.id, userId);
  }

  async update(diaryId: string, userId: string, dto: UpdateDiaryDto) {
    const diary = await this.diaryRepository.findOne({ where: { id: diaryId } });

    if (!diary) {
      throw new NotFoundException('Diary not found');
    }
    if (diary.userId !== userId) {
      throw new ForbiddenException('You can only edit your own diary');
    }

    Object.assign(diary, dto);
    await this.diaryRepository.save(diary);

    // Update images if provided
    if (dto.imageUrls !== undefined) {
      await this.imageRepository.delete({ diaryId });
      if (dto.imageUrls.length) {
        const images = dto.imageUrls.map((url, index) =>
          this.imageRepository.create({
            diaryId,
            imageUrl: url,
            sortOrder: index,
          }),
        );
        await this.imageRepository.save(images);
      }
    }

    return this.findById(diaryId, userId);
  }

  async delete(diaryId: string, userId: string) {
    const diary = await this.diaryRepository.findOne({ where: { id: diaryId } });

    if (!diary) {
      throw new NotFoundException('Diary not found');
    }
    if (diary.userId !== userId) {
      throw new ForbiddenException('You can only delete your own diary');
    }

    await this.diaryRepository.softDelete(diaryId);
    return { message: 'Diary deleted successfully' };
  }
}
