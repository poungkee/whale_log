/**
 * @file badges.service.ts
 * @description 뱃지 서비스 - 조건 체크 및 자동 수여
 *
 * 각 트리거 포인트(회원가입, 다이어리 작성, 즐겨찾기, 투표 등)에서
 * checkAndAward() 를 호출하면 조건을 확인하고 뱃지를 자동 수여합니다.
 *
 * 퍼스트 웨이버 race condition 방지:
 * - spot_first_wavers 테이블에 INSERT ... ON CONFLICT DO NOTHING 사용
 * - DB 레벨 PRIMARY KEY(spot_id)로 동시 요청 시 1명만 통과
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { SpotFirstWaver } from './entities/spot-first-waver.entity';
import { BADGE_DEFINITIONS, APP_ANNIVERSARY_MONTH, APP_ANNIVERSARY_DAY } from './badge-definitions';

/** 뱃지 트리거 타입 — 어느 시점에 체크할지 */
export type BadgeTrigger =
  | 'REGISTER'          // 회원가입
  | 'PROFILE_UPDATE'    // 프로필(레벨/보드) 변경
  | 'DIARY_CREATE'      // 다이어리 작성
  | 'FAVORITE_ADD'      // 즐겨찾기 추가
  | 'VOTE'              // 컨디션 투표
  | 'GUIDE_READ'        // 가이드 읽기
  | 'LOGIN';            // 로그인 (개근상 체크)

/** checkAndAward 에 전달하는 컨텍스트 */
export interface BadgeContext {
  userId: string;
  trigger: BadgeTrigger;
  /** 다이어리 관련 컨텍스트 */
  diary?: {
    id: string;
    spotId: string;
    spotRegion: string;       // 발리 여부 판단 (Bali% → 발리)
    surfDate: string;         // YYYY-MM-DD
    surfTime?: string | null; // HH:mm
    boardType: string;
    satisfaction: number;
    hasImages: boolean;
    waveHeight?: number;      // 해당 스팟 당일 예보 파고 (m)
    surfRating?: number;      // 해당 스팟 당일 예보 점수 (1~10)
  };
  /** 즐겨찾기 관련 */
  favoriteCount?: number;
  /** 투표 관련 */
  voteCount?: number;
  /** 가이드 관련 */
  guideReadCount?: number;
  totalGuideCount?: number;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepo: Repository<Badge>,

    @InjectRepository(UserBadge)
    private readonly userBadgeRepo: Repository<UserBadge>,

    @InjectRepository(SpotFirstWaver)
    private readonly firstWaverRepo: Repository<SpotFirstWaver>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * 뱃지 시드 — 앱 시작 시 badges 테이블에 정의 목록 삽입 (없는 것만)
   */
  async seedBadges(): Promise<void> {
    for (const def of BADGE_DEFINITIONS) {
      const exists = await this.badgeRepo.findOne({ where: { key: def.key } });
      if (!exists) {
        await this.badgeRepo.save(this.badgeRepo.create(def));
      }
    }
    this.logger.log(`뱃지 시드 완료: ${BADGE_DEFINITIONS.length}개`);
  }

  /**
   * 트리거 발생 시 해당 유저의 뱃지 조건 전체 체크 후 수여
   * - 이미 보유한 뱃지는 건너뜀
   * - 수여된 뱃지 key 배열 반환
   */
  async checkAndAward(ctx: BadgeContext): Promise<string[]> {
    const awarded: string[] = [];

    try {
      const existing = await this.getEarnedKeys(ctx.userId);
      const award = async (key: string) => {
        if (!existing.has(key)) {
          await this.awardBadge(ctx.userId, key);
          existing.add(key);
          awarded.push(key);
        }
      };

      switch (ctx.trigger) {
        case 'REGISTER':
          await this.checkRegisterBadges(ctx, award);
          break;
        case 'PROFILE_UPDATE':
          await this.checkProfileBadges(ctx, award);
          break;
        case 'DIARY_CREATE':
          await this.checkDiaryBadges(ctx, award, existing);
          break;
        case 'FAVORITE_ADD':
          await this.checkFavoriteBadges(ctx, award);
          break;
        case 'VOTE':
          await this.checkVoteBadges(ctx, award);
          break;
        case 'GUIDE_READ':
          await this.checkGuideBadges(ctx, award);
          break;
        case 'LOGIN':
          await this.checkLoginBadges(ctx, award);
          break;
      }
    } catch (err) {
      this.logger.error(`뱃지 체크 오류 (userId=${ctx.userId}): ${(err as Error).message}`);
    }

    if (awarded.length > 0) {
      this.logger.log(`뱃지 수여 완료 (userId=${ctx.userId}): ${awarded.join(', ')}`);
    }

    return awarded;
  }

  // ─── 트리거별 체크 로직 ────────────────────────────────────

  /** 회원가입 시 체크 */
  private async checkRegisterBadges(ctx: BadgeContext, award: (key: string) => Promise<void>) {
    await award('WELCOME');

    /** 창립 멤버 — 전체 유저 수 조회 (이미 이 유저 포함) */
    const totalUsers = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL`,
    );
    const count = parseInt(totalUsers[0].cnt, 10);
    if (count <= 10) await award('FOUNDER');
    if (count <= 100) await award('EARLY_BIRD');
  }

  /** 프로필 업데이트 시 체크 */
  private async checkProfileBadges(ctx: BadgeContext, award: (key: string) => Promise<void>) {
    const user = await this.dataSource.query(
      `SELECT surf_level, board_type FROM users WHERE id = $1`,
      [ctx.userId],
    );
    if (!user[0]) return;

    const { surf_level, board_type } = user[0];

    /** 파도의 시작 — 레벨과 보드 타입이 모두 설정된 경우 */
    if (surf_level && board_type && board_type !== 'UNSET') {
      await award('PROFILE_COMPLETE');
    }

    /** 프로 서퍼 — EXPERT 레벨 + 활동 검증 (자기 선언만으론 못 받음) */
    if (surf_level === 'EXPERT') {
      await this.checkProSurfer(ctx.userId, award);
    }
  }

  /**
   * PRO_SURFER 활동 검증 — EXPERT 레벨 + 두 옵션 중 하나 충족 시 부여
   *  - 옵션 A: 사진 포함 다이어리 10개 이상 (사진으로 활동 인증)
   *  - 옵션 B: 다이어리 10개 + 다른 뱃지 5개 이상 (전반 활동성 인증)
   * 사용자 활동 스타일이 다양해서 OR 조건으로 케이스 모두 인정.
   */
  private async checkProSurfer(userId: string, award: (key: string) => Promise<void>) {
    /** 사진 포함 다이어리 수 */
    const photoResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT d.id) as cnt FROM surf_diaries d
       JOIN diary_images di ON di.diary_id = d.id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
      [userId],
    );
    const photoCount = parseInt(photoResult[0].cnt, 10);

    /** 일반 다이어리 수 */
    const diaryResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    const diaryCount = parseInt(diaryResult[0].cnt, 10);

    /** PRO_SURFER 자신 제외 보유 뱃지 수 */
    const badgeResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = $1 AND badge_key != 'PRO_SURFER'`,
      [userId],
    );
    const badgeCount = parseInt(badgeResult[0].cnt, 10);

    const optionA = photoCount >= 10;
    const optionB = diaryCount >= 10 && badgeCount >= 5;

    if (optionA || optionB) {
      await award('PRO_SURFER');
    }
  }

  /** 다이어리 작성 시 체크 */
  private async checkDiaryBadges(
    ctx: BadgeContext,
    award: (key: string) => Promise<void>,
    existing: Set<string>,
  ) {
    if (!ctx.diary) return;
    const { id: diaryId, spotId, spotRegion, surfDate, surfTime, boardType, satisfaction, hasImages, waveHeight, surfRating } = ctx.diary;

    /** 전체 다이어리 수 조회 */
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries WHERE user_id = $1 AND deleted_at IS NULL`,
      [ctx.userId],
    );
    const diaryCount = parseInt(countResult[0].cnt, 10);

    /** 첫 다이어리 */
    if (diaryCount >= 1) await award('FIRST_DIARY');
    /** 10개 */
    if (diaryCount >= 10) await award('DIARY_10');
    /** 100개 */
    if (diaryCount >= 100) await award('DIARY_100');

    /** 사진 포함 다이어리 수 */
    const photoResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT d.id) as cnt FROM surf_diaries d
       JOIN diary_images di ON di.diary_id = d.id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL`,
      [ctx.userId],
    );
    const photoCount = parseInt(photoResult[0].cnt, 10);
    if (photoCount >= 1) await award('FIRST_PHOTO_DIARY');
    if (photoCount >= 20) await award('PHOTO_DIARY_20');
    if (photoCount >= 50) await award('PHOTO_DIARY_50');
    if (photoCount >= 100) await award('PHOTO_DIARY_100');

    /** 다꾸의 권위자 — hasImages 사용 (방금 작성한 다이어리 사진 여부) */
    if (hasImages && diaryCount === 1) await award('FIRST_PHOTO_DIARY');

    /** 보드 종류 수 집계 */
    const boardResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT board_type) as cnt FROM surf_diaries WHERE user_id = $1 AND deleted_at IS NULL`,
      [ctx.userId],
    );
    const boardCount = parseInt(boardResult[0].cnt, 10);
    if (boardCount >= 3) await award('BOARD_3');
    if (boardCount >= 5) await award('BOARD_5');
    if (boardCount >= 7) await award('BOARD_7');
    if (boardCount >= 9) await award('BOARD_ALL');

    /** 발리/한국 스팟 */
    const isBali = spotRegion.startsWith('Bali');
    if (isBali) await award('BALI_SURFER');
    else await award('KOREAN_SURFER');

    /** 두 나라 서퍼 */
    const baliCount = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries d
       JOIN spots s ON s.id = d.spot_id
       WHERE d.user_id = $1 AND s.region LIKE 'Bali%' AND d.deleted_at IS NULL`,
      [ctx.userId],
    );
    const koreaCount = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries d
       JOIN spots s ON s.id = d.spot_id
       WHERE d.user_id = $1 AND s.region NOT LIKE 'Bali%' AND d.deleted_at IS NULL`,
      [ctx.userId],
    );
    if (parseInt(baliCount[0].cnt) >= 1 && parseInt(koreaCount[0].cnt) >= 1) {
      await award('TWO_COUNTRIES');
    }
    /** 3만ft 서퍼 — 한국/발리 각 5개 이상 */
    if (parseInt(baliCount[0].cnt) >= 5 && parseInt(koreaCount[0].cnt) >= 5) {
      await award('THREE_COUNTRIES');
    }

    /** 파도 소믈리에 — 5개 스팟에서 각 3회 이상 */
    const sommResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM (
         SELECT spot_id FROM surf_diaries WHERE user_id = $1 AND deleted_at IS NULL
         GROUP BY spot_id HAVING COUNT(*) >= 3
       ) t`,
      [ctx.userId],
    );
    if (parseInt(sommResult[0].cnt) >= 5) await award('SOMMELIER');

    /** 나만 아는 스팟 — 이 스팟의 다른 유저 다이어리 수 */
    const otherDiaryResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries
       WHERE spot_id = $1 AND user_id != $2 AND deleted_at IS NULL`,
      [spotId, ctx.userId],
    );
    if (parseInt(otherDiaryResult[0].cnt) === 0) await award('SECRET_SPOT');

    /** 같은 스팟 집착 */
    const spotCountResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries WHERE user_id = $1 AND spot_id = $2 AND deleted_at IS NULL`,
      [ctx.userId, spotId],
    );
    const spotCount = parseInt(spotCountResult[0].cnt, 10);
    if (spotCount >= 20) await award('STUBBORN');
    if (spotCount >= 50) await award('OCEAN_CRUSH');

    /** 시간대 뱃지 — surfTime 기반 */
    if (surfTime) {
      const hour = parseInt(surfTime.split(':')[0], 10);
      if (hour < 6) await award('DAWN_SURFER');
      if (hour >= 18) await award('SUNSET_SURFER');
      if (hour >= 1 && hour < 4) await award('NIGHT_OWL');
    }

    /** 계절 뱃지 */
    const month = parseInt(surfDate.split('-')[1], 10);
    if ([12, 1, 2].includes(month)) {
      await award('WINTER_SURFER');
      const winterResult = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM surf_diaries
         WHERE user_id = $1 AND EXTRACT(MONTH FROM surf_date::date) IN (12, 1, 2) AND deleted_at IS NULL`,
        [ctx.userId],
      );
      if (parseInt(winterResult[0].cnt) >= 5) await award('WINTER_WARRIOR');
    }

    /** 사계절 서퍼 */
    const seasonResult = await this.dataSource.query(
      `SELECT
         COUNT(CASE WHEN EXTRACT(MONTH FROM surf_date::date) IN (3,4,5) THEN 1 END) as spring,
         COUNT(CASE WHEN EXTRACT(MONTH FROM surf_date::date) IN (6,7,8) THEN 1 END) as summer,
         COUNT(CASE WHEN EXTRACT(MONTH FROM surf_date::date) IN (9,10,11) THEN 1 END) as fall,
         COUNT(CASE WHEN EXTRACT(MONTH FROM surf_date::date) IN (12,1,2) THEN 1 END) as winter
       FROM surf_diaries WHERE user_id = $1 AND deleted_at IS NULL`,
      [ctx.userId],
    );
    const s = seasonResult[0];
    if (parseInt(s.spring) >= 1 && parseInt(s.summer) >= 1 && parseInt(s.fall) >= 1 && parseInt(s.winter) >= 1) {
      await award('FOUR_SEASONS');
    }

    /** 하루 2개 다이어리 */
    const sameDayResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries WHERE user_id = $1 AND surf_date = $2 AND deleted_at IS NULL`,
      [ctx.userId, surfDate],
    );
    if (parseInt(sameDayResult[0].cnt) >= 2) await award('DOUBLE_SESSION');

    /** 가입 당일 다이어리 */
    const userResult = await this.dataSource.query(
      `SELECT created_at FROM users WHERE id = $1`,
      [ctx.userId],
    );
    if (userResult[0]) {
      const joinDate = new Date(userResult[0].created_at).toISOString().split('T')[0];
      if (joinDate === surfDate) await award('DAY_ONE_DIARY');
    }

    /** 만족도 뱃지 */
    if (satisfaction === 5) await award('PERFECT_DAY');
    if (satisfaction === 1) await award('WIPEOUT_DAY');

    const satResult = await this.dataSource.query(
      `SELECT
         COUNT(CASE WHEN satisfaction = 5 THEN 1 END) as five_cnt,
         COUNT(CASE WHEN satisfaction = 1 THEN 1 END) as one_cnt
       FROM surf_diaries WHERE user_id = $1 AND deleted_at IS NULL`,
      [ctx.userId],
    );
    const fiveCnt = parseInt(satResult[0].five_cnt, 10);
    const oneCnt = parseInt(satResult[0].one_cnt, 10);
    if (fiveCnt >= 10) await award('DEEP_FISH');
    if (oneCnt >= 5) await award('TEARS_OF_WAVE');
    if (fiveCnt >= 1 && oneCnt >= 1) await award('ROLLERCOASTER');

    /** 연속 다이어리 체크 */
    await this.checkStreak(ctx.userId, surfDate, award);

    /** 짝꿍 서퍼 — 같은 날 같은 스팟 다른 유저 */
    const buddyResult = await this.dataSource.query(
      `SELECT DISTINCT user_id FROM surf_diaries
       WHERE spot_id = $1 AND surf_date = $2 AND user_id != $3 AND deleted_at IS NULL`,
      [spotId, surfDate, ctx.userId],
    );
    if (buddyResult.length > 0) {
      await award('SURF_BUDDY');
      /** 파도 동창 — 같은 유저와 짝꿍 3번 */
      for (const buddy of buddyResult) {
        const classResult = await this.dataSource.query(
          `SELECT COUNT(DISTINCT d1.surf_date) as cnt
           FROM surf_diaries d1
           JOIN surf_diaries d2 ON d1.spot_id = d2.spot_id AND d1.surf_date = d2.surf_date
           WHERE d1.user_id = $1 AND d2.user_id = $2 AND d1.deleted_at IS NULL AND d2.deleted_at IS NULL`,
          [ctx.userId, buddy.user_id],
        );
        const classCnt = parseInt(classResult[0].cnt, 10);
        if (classCnt >= 3) await award('SURF_CLASSMATE');
        if (classCnt >= 10) await award('WAVE_WITH_WHALE');
      }
    }

    /** 복수의 파도 — 만족도 1점 스팟 재방문 후 4점 이상 */
    if (satisfaction >= 4) {
      const revengeResult = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM surf_diaries
         WHERE user_id = $1 AND spot_id = $2 AND satisfaction = 1 AND surf_date < $3 AND deleted_at IS NULL`,
        [ctx.userId, spotId, surfDate],
      );
      if (parseInt(revengeResult[0].cnt) >= 1) await award('REVENGE_WAVE');
    }

    /** 서퍼의 저주 — 만족도 1점 후 다음날 같은 스팟 */
    if (!existing.has('CURSED_SURFER')) {
      const yesterday = new Date(surfDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0];
      const curseResult = await this.dataSource.query(
        `SELECT COUNT(*) as cnt FROM surf_diaries
         WHERE user_id = $1 AND spot_id = $2 AND surf_date = $3 AND satisfaction = 1 AND deleted_at IS NULL`,
        [ctx.userId, spotId, yDate],
      );
      if (parseInt(curseResult[0].cnt) >= 1) await award('CURSED_SURFER');
    }

    /** 역발상 서퍼 — 예보 1~2점인 날 만족도 5점 */
    if (satisfaction === 5 && surfRating !== undefined && surfRating <= 2) {
      await award('REBEL_SURFER');
    }

    /** 파도 장인 — 예보 9~10점인 날 만족도 5점 */
    if (satisfaction === 5 && surfRating !== undefined && surfRating >= 9) {
      await award('WAVE_MASTER');
    }

    /** 장판의 날 — 파고 0.3m 이하 */
    if (waveHeight !== undefined && waveHeight <= 0.3) {
      await award('FLAT_DAY');
    }

    /** 파도 타임캡슐 — 1년 전 ±3일 같은 스팟 */
    const timeCapsuleResult = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM surf_diaries
       WHERE user_id = $1 AND spot_id = $2
         AND surf_date::date BETWEEN ($3::date - interval '1 year' - interval '3 days')
                                 AND ($3::date - interval '1 year' + interval '3 days')
         AND deleted_at IS NULL`,
      [ctx.userId, spotId, surfDate],
    );
    if (parseInt(timeCapsuleResult[0].cnt) >= 1) await award('TIME_CAPSULE');

    /** 퍼스트 웨이버 — race condition 방지: spot_first_wavers PRIMARY KEY 활용 */
    await this.checkFirstWaver(ctx.userId, spotId, diaryId, award);

    /**
     * PRO_SURFER 체크 — 다이어리 작성 시 사진/다이어리 수가 늘어나니 매번 체크.
     * EXPERT 레벨 사용자만 의미 있어 surf_level 먼저 확인.
     */
    const proCheckUser = await this.dataSource.query(
      `SELECT surf_level FROM users WHERE id = $1`,
      [ctx.userId],
    );
    if (proCheckUser[0]?.surf_level === 'EXPERT') {
      await this.checkProSurfer(ctx.userId, award);
    }
  }

  /** 즐겨찾기 추가 시 체크 */
  private async checkFavoriteBadges(ctx: BadgeContext, award: (key: string) => Promise<void>) {
    const cnt = ctx.favoriteCount ?? 0;
    if (cnt >= 1) await award('FIRST_FAVORITE');
    if (cnt >= 10) await award('FAVORITE_10');
    if (cnt >= 20) await award('FAVORITE_20');
  }

  /** 투표 시 체크 */
  private async checkVoteBadges(ctx: BadgeContext, award: (key: string) => Promise<void>) {
    const cnt = ctx.voteCount ?? 0;
    if (cnt >= 1) await award('FIRST_VOTE');
    if (cnt >= 30) await award('VOTE_30');
  }

  /** 가이드 읽기 시 체크 */
  private async checkGuideBadges(ctx: BadgeContext, award: (key: string) => Promise<void>) {
    const read = ctx.guideReadCount ?? 0;
    const total = ctx.totalGuideCount ?? 999;
    if (read >= 5) await award('GUIDE_5');
    if (read >= total && total > 0) await award('GUIDE_ALL');
  }

  /**
   * 로그인 시 체크 — 개근상 + 가입 뱃지 백필
   *
   * 가입 백필: REGISTER 트리거 도입 이전 가입자(예: day20~21에 가입한 카카오/구글 사용자)에게
   * WELCOME/FOUNDER/EARLY_BIRD를 소급 부여. award는 이미 보유한 뱃지는 건너뛰므로 영향 없음.
   */
  private async checkLoginBadges(ctx: BadgeContext, award: (key: string) => Promise<void>) {
    /** 가입 뱃지 백필 */
    await award('WELCOME');
    const totalUsers = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL`,
    );
    const userCount = parseInt(totalUsers[0].cnt, 10);
    if (userCount <= 10) await award('FOUNDER');
    if (userCount <= 100) await award('EARLY_BIRD');

    /** 개근상 — 앱 기념일 ±3일 이내 로그인 */
    const now = new Date();
    const anniversaryDate = new Date(now.getFullYear(), APP_ANNIVERSARY_MONTH - 1, APP_ANNIVERSARY_DAY);
    const diffDays = Math.abs((now.getTime() - anniversaryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      const year = now.getFullYear();
      await award(`ANNIVERSARY_${year}`);
    }
  }

  // ─── 헬퍼 메서드 ───────────────────────────────────────────

  /** 연속 다이어리 체크 (7일, 30일) */
  private async checkStreak(userId: string, surfDate: string, award: (key: string) => Promise<void>) {
    const result = await this.dataSource.query(
      `WITH dates AS (
         SELECT DISTINCT surf_date::date as d FROM surf_diaries
         WHERE user_id = $1 AND deleted_at IS NULL
         ORDER BY d DESC
       ),
       streaks AS (
         SELECT d, d - ROW_NUMBER() OVER (ORDER BY d DESC) * interval '1 day' as grp FROM dates
       )
       SELECT COUNT(*) as streak FROM streaks
       WHERE grp = (SELECT grp FROM streaks WHERE d = $2::date LIMIT 1)`,
      [userId, surfDate],
    );
    const streak = parseInt(result[0]?.streak ?? '0', 10);
    if (streak >= 7) await award('STREAK_7');
    if (streak >= 30) await award('STREAK_30');
  }

  /**
   * 퍼스트 웨이버 체크 — race condition 방지
   * spot_first_wavers PRIMARY KEY(spot_id) + ON CONFLICT DO NOTHING
   */
  private async checkFirstWaver(
    userId: string,
    spotId: string,
    diaryId: string,
    award: (key: string) => Promise<void>,
  ) {
    const result = await this.dataSource.query(
      `INSERT INTO spot_first_wavers (spot_id, user_id, diary_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (spot_id) DO NOTHING
       RETURNING user_id`,
      [spotId, userId, diaryId],
    );
    /** INSERT가 성공한 경우(=첫 번째 작성자)만 뱃지 수여 */
    if (result.length > 0 && result[0].user_id === userId) {
      await award('FIRST_WAVER');
    }
  }

  /** 유저가 이미 보유한 뱃지 key Set 조회 */
  private async getEarnedKeys(userId: string): Promise<Set<string>> {
    const badges = await this.userBadgeRepo.find({ where: { userId } });
    return new Set(badges.map((b) => b.badgeKey));
  }

  /** 뱃지 수여 (중복 무시) */
  private async awardBadge(userId: string, badgeKey: string): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO user_badges (id, user_id, badge_key)
         VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (user_id, badge_key) DO NOTHING`,
        [userId, badgeKey],
      );
    } catch (err) {
      this.logger.warn(`뱃지 수여 실패 (${badgeKey}): ${(err as Error).message}`);
    }
  }

  // ─── 조회 API ─────────────────────────────────────────────

  /** 전체 뱃지 목록 + 유저 획득 여부 반환 */
  async getBadgesWithStatus(userId: string) {
    const allBadges = await this.badgeRepo.find({ order: { sortOrder: 'ASC' } });
    const earnedKeys = await this.getEarnedKeys(userId);
    const earnedDates = await this.userBadgeRepo.find({ where: { userId } });
    const dateMap = new Map(earnedDates.map((b) => [b.badgeKey, b.earnedAt]));

    return allBadges.map((badge) => {
      const isEarned = earnedKeys.has(badge.key);
      return {
        key: badge.key,
        nameKo: badge.nameKo,
        /** 히든 뱃지이고 아직 미획득이면 설명 숨김 */
        descriptionKo: badge.isHidden && !isEarned ? '???을 달성하면 획득할 수 있어요' : badge.descriptionKo,
        icon: badge.isHidden && !isEarned ? '🔒' : badge.icon,
        category: badge.category,
        isHidden: badge.isHidden,
        isEarned,
        earnedAt: isEarned ? dateMap.get(badge.key) : null,
      };
    });
  }

  /** 유저가 획득한 뱃지만 반환 */
  async getEarnedBadges(userId: string) {
    const all = await this.getBadgesWithStatus(userId);
    return all.filter((b) => b.isEarned);
  }

  /** 운영자 직접 수여 */
  async awardByAdmin(userId: string, badgeKey: string): Promise<void> {
    await this.awardBadge(userId, badgeKey);
    this.logger.log(`관리자 직접 수여: userId=${userId}, badge=${badgeKey}`);
  }
}
