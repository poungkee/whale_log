/**
 * @file base.entity.ts
 * @description 모든 엔티티의 공통 기반 클래스 (Base Entity)
 *
 * 모든 데이터베이스 엔티티가 상속하는 추상 클래스입니다.
 * 공통 필드(id, 생성일, 수정일, 삭제일)를 정의하여 코드 중복을 방지합니다.
 *
 * - id: UUID 형식의 기본키 (자동 생성)
 * - createdAt: 레코드 생성 시각 (자동 설정)
 * - updatedAt: 레코드 수정 시각 (자동 갱신)
 * - deletedAt: 소프트 삭제 시각 (null이면 활성, 값이 있으면 삭제된 상태)
 *
 * 소프트 삭제(Soft Delete) 패턴을 사용하여 실제 DB에서 데이터를 삭제하지 않고
 * deletedAt에 삭제 시각을 기록합니다. 이를 통해 데이터 복구가 가능합니다.
 */

import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  /** UUID v4 형식의 기본키 - 레코드 생성 시 자동으로 고유 ID 생성 */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 레코드 생성 시각 - INSERT 시 자동으로 현재 시각 설정 (타임존 포함) */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** 레코드 수정 시각 - UPDATE 시 자동으로 현재 시각으로 갱신 (타임존 포함) */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** 소프트 삭제 시각 - null이면 활성 상태, 값이 있으면 삭제된 것으로 간주 */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
