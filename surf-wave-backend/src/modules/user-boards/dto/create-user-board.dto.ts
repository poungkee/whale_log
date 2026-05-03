/**
 * @file create-user-board.dto.ts
 * @description 보드 등록 요청 DTO
 */
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { UserBoardType } from '../../../common/enums';

export class CreateUserBoardDto {
  /** 보드 별명 (필수, 1~30자) */
  @IsString()
  @Length(1, 30)
  nickname: string;

  /** 보드 타입 (9종 enum) */
  @IsEnum(UserBoardType)
  boardType: UserBoardType;

  /** 보드 길이 ft (선택, 3.0~12.0) */
  @IsOptional()
  @IsNumber()
  @Min(3.0)
  @Max(12.0)
  sizeFt?: number | null;

  /** 메인 보드 여부 (선택, 기본 false) — true면 다른 보드의 isPrimary는 자동 false */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** 메모 (선택, 200자) */
  @IsOptional()
  @IsString()
  @Length(0, 200)
  notes?: string | null;
}
