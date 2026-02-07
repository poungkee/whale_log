/**
 * @file vote.dto.ts
 * @description 스팟 컨디션 투표 요청 DTO
 * POST /spots/:spotId/vote - 오늘의 파도 상태에 대해 UP/DOWN 투표
 */
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '../../../common/enums/vote-type.enum';

export class VoteDto {
  @ApiProperty({ enum: VoteType, description: 'Vote type for spot condition' })
  @IsEnum(VoteType)
  voteType: VoteType;
}
