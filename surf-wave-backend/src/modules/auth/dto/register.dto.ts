import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialProvider } from '../../../common/enums/social-provider.enum';

export class RegisterDto {
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  @IsNotEmpty()
  firebaseToken: string;

  @ApiProperty({ description: 'User nickname', minLength: 2, maxLength: 30 })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname: string;

  @ApiPropertyOptional({ enum: SocialProvider })
  @IsOptional()
  @IsEnum(SocialProvider)
  provider?: SocialProvider;
}
