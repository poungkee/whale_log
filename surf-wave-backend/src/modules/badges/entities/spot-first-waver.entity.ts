/**
 * @file spot-first-waver.entity.ts
 * @description 스팟별 첫 다이어리 작성자 기록 - spot_first_wavers 테이블
 *
 * 퍼스트 웨이버 뱃지의 race condition 방지를 위한 전용 테이블입니다.
 * spot_id가 PRIMARY KEY이므로 DB 레벨에서 스팟당 1명만 기록됩니다.
 * 두 유저가 동시에 같은 스팟에 첫 다이어리를 쓰더라도
 * INSERT에서 하나만 성공하고 나머지는 무시됩니다.
 */

import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('spot_first_wavers')
export class SpotFirstWaver {
  /** 스팟 ID — PRIMARY KEY로 스팟당 1명만 기록 가능 */
  @PrimaryColumn({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  /** 첫 다이어리 작성 유저 ID */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** 첫 다이어리 ID */
  @Column({ name: 'diary_id', type: 'uuid' })
  diaryId: string;

  /** 뱃지 획득 시각 */
  @CreateDateColumn({ name: 'earned_at', type: 'timestamptz' })
  earnedAt: Date;
}
