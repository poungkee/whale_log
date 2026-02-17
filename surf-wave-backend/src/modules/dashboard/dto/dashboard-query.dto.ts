import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Difficulty } from '../../../common/enums/difficulty.enum';
import { UserBoardType } from '../../../common/enums/user-board-type.enum';

export class DashboardQueryDto {
  /** 서핑 레벨 필터 - 레벨에 맞는 스팟만 반환 */
  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  level?: Difficulty;

  /** 보드 타입 - hints 메시지에 보드별 팁 포함 (선택) */
  @ApiPropertyOptional({ enum: UserBoardType })
  @IsOptional()
  @IsEnum(UserBoardType)
  boardType?: UserBoardType;
}
