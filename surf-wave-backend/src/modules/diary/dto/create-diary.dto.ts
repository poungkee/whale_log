/**
 * @file create-diary.dto.ts
 * @description 다이어리 생성 요청 DTO - 서핑 날짜/시간, 스팟, 보드종류, 파도상태, 감상 등
 *
 * surfTime 필드:
 * - 서핑 시작 시간 (HH:mm 형식, 예: "10:00")
 * - 이 시간 + surfDate + spotId 조합으로 해당 시점의 forecast 데이터를 자동 매칭
 * - 선택 입력이지만, 입력하면 정확한 파도 데이터가 다이어리에 자동 연결됨
 */
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoardType } from '../../../common/enums/board-type.enum';
import { Visibility } from '../../../common/enums/visibility.enum';

export class CreateDiaryDto {
  /** 서핑한 스팟 ID (UUID) */
  @ApiProperty({ description: '서핑한 스팟 ID' })
  @IsUUID()
  spotId: string;

  /** 서핑한 날짜 (YYYY-MM-DD 형식) */
  @ApiProperty({ description: '서핑 날짜 (YYYY-MM-DD)' })
  @IsDateString()
  surfDate: string;

  /**
   * 서핑 시작 시간 (HH:mm 형식, 예: "06:00", "10:00")
   * - 이 시간 기준으로 forecast DB에서 해당 스팟의 파도 데이터를 자동 조회
   * - 선택 입력: 미입력 시 forecast 자동 매칭 안 함
   */
  @ApiPropertyOptional({ description: '서핑 시작 시간 (HH:mm)', example: '10:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: '시간 형식이 올바르지 않습니다 (HH:mm)',
  })
  surfTime?: string;

  /** 사용한 보드 타입 — 8종류 + MIDLENGTH */
  @ApiProperty({ enum: BoardType })
  @IsEnum(BoardType)
  boardType: BoardType;

  /**
   * 그날 사용한 보드 길이 (피트, 소수점 1자리)
   * 선택사항 — 모르면 안 보내도 됨
   * 범위: 3.0 ~ 12.0 ft
   */
  @ApiPropertyOptional({ description: '보드 길이 (피트)', example: 6.2 })
  @IsOptional()
  @IsNumber({}, { message: '보드 길이는 숫자여야 합니다' })
  @Min(3.0, { message: '보드 길이는 3.0ft 이상이어야 합니다' })
  @Max(12.0, { message: '보드 길이는 12.0ft 이하여야 합니다' })
  boardSizeFt?: number;

  /** 서핑 시간 (분 단위, 최소 1분) */
  @ApiProperty({ description: '서핑 시간 (분)' })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  /** 만족도 (1~5점, 1=별로 ~ 5=최고) */
  @ApiProperty({ description: '만족도 (1~5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction: number;

  /**
   * 이 스팟에 대한 추천 별점 (1~5, 선택)
   * - 별점을 매기면 스팟의 평균 평점에 반영됨 (공개/비공개 무관)
   * - 안 매기면 평균 계산에서 제외 (현재 만족도와 분리)
   */
  @ApiPropertyOptional({ description: '이 스팟 추천도 (1~5, 선택)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** 메모/기록 (선택, 자유 텍스트) */
  @ApiPropertyOptional({ description: '메모/기록' })
  @IsOptional()
  @IsString()
  memo?: string;

  /** 공개 설정 (PRIVATE=나만 보기, PUBLIC=전체 공개, 기본값: PRIVATE) */
  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PRIVATE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  /** 첨부 이미지 URL 배열 (선택) */
  @ApiPropertyOptional({ description: '이미지 URL 목록', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
