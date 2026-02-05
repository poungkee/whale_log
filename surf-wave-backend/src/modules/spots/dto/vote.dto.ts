import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '../../../common/enums/vote-type.enum';

export class VoteDto {
  @ApiProperty({ enum: VoteType, description: 'Vote type for spot condition' })
  @IsEnum(VoteType)
  voteType: VoteType;
}
