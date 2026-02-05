import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AgreeTermsDto {
  @ApiProperty({ type: [String], description: 'List of terms IDs to agree' })
  @IsArray()
  @IsUUID('4', { each: true })
  termsIds: string[];
}
