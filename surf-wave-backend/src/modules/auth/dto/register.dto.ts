/**
 * @file register.dto.ts
 * @description 회원가입 요청 DTO
 *
 * 클라이언트에서 Firebase 소셜 로그인 후 받은 토큰과 함께
 * 닉네임, 소셜 로그인 제공자 정보를 전달하여 회원가입을 요청합니다.
 */

import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialProvider } from '../../../common/enums/social-provider.enum';

export class RegisterDto {
  /** Firebase ID 토큰 - 소셜 로그인 후 발급받은 JWT */
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  @IsNotEmpty()
  firebaseToken: string;

  /** 사용자 닉네임 - 2~30자, 고유값 (중복 불가) */
  @ApiProperty({ description: 'User nickname', minLength: 2, maxLength: 30 })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname: string;

  /** 소셜 로그인 제공자 (선택) - GOOGLE, APPLE, KAKAO */
  @ApiPropertyOptional({ enum: SocialProvider })
  @IsOptional()
  @IsEnum(SocialProvider)
  provider?: SocialProvider;
}
