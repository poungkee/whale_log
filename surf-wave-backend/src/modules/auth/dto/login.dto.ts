/**
 * @file login.dto.ts
 * @description 로그인 요청 DTO
 *
 * 클라이언트에서 Firebase 소셜 로그인 후 받은 ID 토큰을 전달합니다.
 * 서버에서 이 토큰을 Firebase Admin SDK로 검증합니다.
 */

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  /** Firebase ID 토큰 - 클라이언트에서 소셜 로그인 후 발급받은 JWT 토큰 */
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  @IsNotEmpty()
  firebaseToken: string;
}
