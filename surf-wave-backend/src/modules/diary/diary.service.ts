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
  Logger,
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
import { WindDirection } from '../../common/enums/wind-direction.enum';
import { getMonthRange } from '../../common/utils/date.util';
import { ForecastsService } from '../forecasts/forecasts.service';
import { BadgesService } from '../badges/badges.service';

/**
 * 바람 각도(0~360)를 16방위 WindDirection enum으로 변환
 * 예: 0° → N, 90° → E, 180° → S, 270° → W
 * 각 방위는 22.5° 간격 (360/16=22.5)
 */
function degreesToWindDirection(degrees: number): WindDirection {
  const dirs: WindDirection[] = [
    WindDirection.N, WindDirection.NNE, WindDirection.NE, WindDirection.ENE,
    WindDirection.E, WindDirection.ESE, WindDirection.SE, WindDirection.SSE,
    WindDirection.S, WindDirection.SSW, WindDirection.SW, WindDirection.WSW,
    WindDirection.W, WindDirection.WNW, WindDirection.NW, WindDirection.NNW,
  ];
  /** 22.5°씩 16방위로 나눠서 가장 가까운 방위 선택 */
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return dirs[index];
}

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(
    @InjectRepository(SurfDiary)
    private readonly diaryRepository: Repository<SurfDiary>,
    @InjectRepository(DiaryImage)
    private readonly imageRepository: Repository<DiaryImage>,
    /** forecast 서비스 - 다이어리 생성 시 해당 시점 파도 데이터 자동 조회용 */
    private readonly forecastsService: ForecastsService,
    /** 뱃지 서비스 - 다이어리 작성 후 뱃지 조건 체크용 */
    private readonly badgesService: BadgesService,
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

  /**
   * 공개 다이어리 목록 조회
   * - visibility가 PUBLIC인 다이어리만 반환
   * - spotId 필터: 특정 스팟의 서핑 기록만 조회 가능 (스팟 상세 모달에서 사용)
   * - 사용자 정보는 id/nickname/avatarUrl만 노출 (보안)
   */
  async findPublic(query: DiaryQueryDto) {
    const { spotId, page = 1, limit = 20 } = query;

    /** where 조건: 공개 + (선택적) 스팟 필터 */
    const where: Record<string, unknown> = { visibility: Visibility.PUBLIC };
    if (spotId) {
      where.spotId = spotId;
    }

    const [diaries, total] = await this.diaryRepository.findAndCount({
      where,
      relations: ['images', 'spot', 'user'],
      order: { surfDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: diaries.map((d) => ({
        ...d,
        user: { id: d.user.id, username: d.user.username, avatarUrl: d.user.avatarUrl },
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

  /**
   * 서핑 다이어리 생성
   *
   * 핵심 로직:
   * 1. surfTime이 있으면 → surfDate + surfTime 조합으로 forecast DB에서
   *    해당 스팟의 파도 데이터(파고, 주기, 풍속, 풍향)를 자동 조회하여 채움
   * 2. 이미지 URL이 있으면 diary_images 테이블에 함께 저장
   *
   * @param userId - JWT에서 추출한 현재 사용자 ID
   * @param dto - 다이어리 생성 요청 데이터
   */
  async create(userId: string, dto: CreateDiaryDto) {
    /** 기본 다이어리 데이터 구성 */
    const diaryData: Partial<SurfDiary> = {
      userId,
      spotId: dto.spotId,
      surfDate: dto.surfDate,
      surfTime: dto.surfTime || null,
      boardType: dto.boardType,
      durationMinutes: dto.durationMinutes,
      satisfaction: dto.satisfaction,
      memo: dto.memo,
      visibility: dto.visibility || Visibility.PRIVATE,
    };

    /** 뱃지 트리거용 forecast 추가 정보 (try 블록 밖에서도 참조하기 위해 외부 변수 보관) */
    let forecastWeatherCondition: string | null = null;

    /**
     * 서핑 시작 시간이 있으면 → 해당 시점의 forecast 데이터 자동 매칭
     * 예: surfDate="2026-03-24", surfTime="10:00", spotId="xxx"
     * → forecasts 테이블에서 spot_id=xxx, forecast_time <= "2026-03-24 10:00" 중 가장 가까운 레코드 조회
     */
    if (dto.surfTime) {
      try {
        const forecast = await this.forecastsService.getHourlyForecast(
          dto.spotId,
          {
            /** surfDate + surfTime → ISO 형식 시작 시각 */
            date: `${dto.surfDate}T${dto.surfTime}:00`,
            /** 1시간 범위만 조회 (정확한 시점 데이터) */
            hours: 1,
          },
        );

        /**
         * 조회된 forecast 중 첫 번째(가장 가까운 시간) 사용
         * forecast에서 파고, 주기, 풍속, 풍향을 다이어리에 자동 기록
         */
        if (forecast && forecast.length > 0) {
          const f = forecast[0];
          diaryData.waveHeight = f.waveHeight;
          diaryData.wavePeriod = f.wavePeriod;
          diaryData.windSpeed = f.windSpeed;
          /** 바람 각도(number) → 16방위 enum으로 변환하여 저장 */
          diaryData.windDirection = f.windDirection != null
            ? degreesToWindDirection(f.windDirection)
            : null;
          /** 뱃지 트리거용 weatherCondition 보관 (RAINY_SURFER 체크) */
          forecastWeatherCondition = (f as any).weatherCondition ?? null;
          this.logger.log(
            `다이어리 forecast 자동 매칭 성공: spot=${dto.spotId}, ` +
            `time=${dto.surfDate} ${dto.surfTime}, ` +
            `파고=${f.waveHeight}m, 주기=${f.wavePeriod}s, 풍속=${f.windSpeed}km/h`,
          );
        } else {
          this.logger.warn(
            `다이어리 forecast 매칭 실패 (데이터 없음): spot=${dto.spotId}, ` +
            `time=${dto.surfDate} ${dto.surfTime}`,
          );
        }
      } catch (err) {
        /** forecast 조회 실패해도 다이어리 생성은 계속 진행 (파도 데이터만 비어있게 됨) */
        this.logger.warn(
          `다이어리 forecast 조회 중 에러 (무시하고 계속): ${(err as Error).message}`,
        );
      }
    }

    const diary = this.diaryRepository.create(diaryData);
    const savedDiary = await this.diaryRepository.save(diary);

    /** 이미지 URL이 있으면 diary_images 테이블에 저장 */
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

    const result = await this.findById(savedDiary.id, userId);

    /** 뱃지 조건 체크 — 새로 획득한 뱃지 키 배열 반환 */
    const newBadges = await this.badgesService.checkAndAward({
      userId,
      trigger: 'DIARY_CREATE',
      diary: {
        id: savedDiary.id,
        spotId: dto.spotId,
        spotRegion: (result as any).spot?.region ?? '',
        surfDate: dto.surfDate,
        surfTime: dto.surfTime || null,
        boardType: dto.boardType,
        satisfaction: dto.satisfaction,
        hasImages: !!(dto.imageUrls?.length),
        waveHeight: diaryData.waveHeight ? Number(diaryData.waveHeight) : undefined,
        /** 다이어리 본문 길이 (LONG_NOVELIST 1000자 체크용) */
        bodyLength: dto.memo?.length ?? 0,
        /** 당일 forecast 날씨 컨디션 (RAINY_SURFER 비 체크용) */
        weatherCondition: forecastWeatherCondition,
      },
    }).catch((err) => { this.logger.warn(`뱃지 체크 실패: ${err.message}`); return []; });

    return { ...result, newBadges };
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
