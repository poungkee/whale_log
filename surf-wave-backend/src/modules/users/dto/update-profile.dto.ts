/**
 * @file update-profile.dto.ts
 * @description 프로필 수정 요청 DTO - 사용자 프로필 정보 업데이트 시 필요한 데이터
 *
 * PATCH /api/v1/users/me 엔드포인트에서 사용됩니다.
 * 모든 필드가 선택적(optional)이므로 변경하고 싶은 필드만 전달하면 됩니다.
 *
 * 수정 가능한 필드:
 * - nickname: 닉네임 (2~30자)
 * - bio: 자기소개 (최대 500자)
 * - avatarUrl: 프로필 사진 URL (S3 업로드 후 URL)
 * - surfLevel: 서핑 레벨 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
 * - notificationsEnabled: 푸시 알림 수신 여부
 */

import { IsString, IsOptional, IsBoolean, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Difficulty } from '../../../common/enums/difficulty.enum';
import { UserBoardType } from '../../../common/enums/user-board-type.enum';

export class UpdateProfileDto {
  /** 닉네임 변경 - 서비스 내 표시 이름 (2~30자, 고유값) */
  @ApiPropertyOptional({ description: '닉네임 (2~30자)', minLength: 2, maxLength: 30, example: '파도타기왕' })
  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다' })
  nickname?: string;

  /** 자기소개 변경 - 프로필에 표시되는 소개글 (최대 500자) */
  @ApiPropertyOptional({ description: '자기소개 (최대 500자)', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '자기소개는 문자열이어야 합니다' })
  @MaxLength(500, { message: '자기소개는 최대 500자까지 가능합니다' })
  bio?: string;

  /** 프로필 사진 URL 변경 - S3에 업로드한 이미지 URL */
  @ApiPropertyOptional({ description: '프로필 사진 URL' })
  @IsOptional()
  @IsString({ message: '프로필 사진 URL은 문자열이어야 합니다' })
  avatarUrl?: string;

  /**
   * 서핑 레벨 변경 - Difficulty enum 값만 허용
   * - BEGINNER: 초급 (서핑 입문자, 인스트럭터 도움으로 파도 타는 중)
   * - INTERMEDIATE: 중급 (스스로 패들링해서 파도를 잡고 테이크오프 가능)
   * - ADVANCED: 상급 (자유롭게 탐, 다양한 기술 구사)
   * - EXPERT: 전문가 (프로 수준, 대회 참가 레벨)
   *
   * 회원가입 후 레벨 선택 화면에서 이 필드로 저장
   * 이후 마이페이지 설정에서 변경 가능
   */
  @ApiPropertyOptional({
    description: '서핑 레벨',
    enum: Difficulty,
    example: Difficulty.BEGINNER,
  })
  @IsOptional()
  @IsEnum(Difficulty, { message: '서핑 레벨은 BEGINNER, INTERMEDIATE, ADVANCED, EXPERT 중 하나여야 합니다' })
  surfLevel?: string;

  /**
   * 보드 타입 변경 - 주로 사용하는 서핑 보드 종류
   * - LONGBOARD: 롱보드 (안정적, 작은 파도에도 적합)
   * - MIDLENGTH: 미드렝스 (중간 크기, 범용적)
   * - SHORTBOARD: 숏보드 (기동성, 큰 파도에서 유리)
   * - UNSET: 미설정
   */
  @ApiPropertyOptional({
    description: '보드 타입',
    enum: UserBoardType,
    example: UserBoardType.LONGBOARD,
  })
  @IsOptional()
  @IsEnum(UserBoardType, { message: '보드 타입은 LONGBOARD, MIDLENGTH, SHORTBOARD, UNSET 중 하나여야 합니다' })
  boardType?: UserBoardType;

  /** 알림 수신 여부 변경 - false로 설정하면 푸시 알림을 받지 않음 */
  @ApiPropertyOptional({ description: '푸시 알림 수신 여부', example: true })
  @IsOptional()
  @IsBoolean({ message: '알림 수신 여부는 true 또는 false여야 합니다' })
  notificationsEnabled?: boolean;
}
