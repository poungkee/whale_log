/**
 * @file social-login.dto.ts
 * @description 소셜 로그인 요청 DTO - Google/Kakao 소셜 로그인 시 필요한 데이터
 *
 * Google 로그인 흐름:
 * 1. 프론트엔드에서 Google Sign-In SDK로 사용자 인증
 * 2. Google에서 발급한 ID 토큰(credential)을 백엔드에 전달
 * 3. 백엔드에서 Google tokeninfo API로 토큰 검증
 *
 * Kakao 로그인 흐름:
 * 1. 프론트엔드에서 Kakao SDK로 사용자 인증
 * 2. Kakao에서 발급한 액세스 토큰(accessToken)을 백엔드에 전달
 * 3. 백엔드에서 Kakao user/me API로 사용자 정보 조회
 */

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Google 소셜 로그인 요청 DTO
 * 사용처: POST /api/v1/auth/google
 */
export class GoogleLoginDto {
  /**
   * Google ID 토큰 - Google Sign-In에서 인증 후 발급받은 credential
   * 이 토큰을 Google tokeninfo API에 전달하여 사용자 정보(sub, email)를 검증
   */
  @ApiProperty({ description: 'Google ID 토큰 (Google Sign-In의 credential)' })
  @IsString({ message: 'credential은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'Google credential은 필수값입니다' })
  credential: string;

  /**
   * 닉네임 (선택) - 신규 가입 시 사용할 닉네임
   * 미입력 시 이메일 앞부분 + 랜덤 4자리로 자동 생성
   * 예: "surfuser@gmail.com" → "surfuser_a1b2"
   */
  @ApiPropertyOptional({ description: '닉네임 (신규 가입 시, 미입력 시 자동 생성)' })
  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다' })
  nickname?: string;
}

/**
 * Kakao 소셜 로그인 요청 DTO
 * 사용처: POST /api/v1/auth/kakao
 */
export class KakaoLoginDto {
  /**
   * Kakao 액세스 토큰 - Kakao SDK에서 인증 후 발급받은 access token
   * 이 토큰으로 Kakao user/me API를 호출하여 사용자 정보(id, email)를 조회
   */
  @ApiProperty({ description: 'Kakao 액세스 토큰 (Kakao SDK의 access token)' })
  @IsString({ message: 'accessToken은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'Kakao access token은 필수값입니다' })
  accessToken: string;

  /**
   * 닉네임 (선택) - 신규 가입 시 사용할 닉네임
   * 미입력 시 이메일 앞부분 + 랜덤 4자리로 자동 생성
   */
  @ApiPropertyOptional({ description: '닉네임 (신규 가입 시, 미입력 시 자동 생성)' })
  @IsOptional()
  @IsString({ message: '닉네임은 문자열이어야 합니다' })
  nickname?: string;
}

/**
 * Kakao 인가코드 콜백 DTO
 * 사용처: POST /api/v1/auth/kakao/callback
 *
 * Kakao OAuth 리다이렉트 방식:
 * 1. 프론트엔드에서 Kakao.Auth.authorize()로 로그인 페이지 이동
 * 2. 사용자 로그인 후 redirectUri로 ?code=xxx 파라미터와 함께 돌아옴
 * 3. 프론트엔드가 code를 백엔드에 전달
 * 4. 백엔드에서 code → 액세스 토큰 교환 → 사용자 정보 조회
 */
export class KakaoCallbackDto {
  /**
   * Kakao 인가 코드 - Kakao 로그인 후 리다이렉트 URI의 query parameter로 전달받은 code
   * 이 코드를 Kakao token API에 전달하여 액세스 토큰으로 교환
   */
  @ApiProperty({ description: 'Kakao 인가 코드 (리다이렉트 후 받은 code 파라미터)' })
  @IsString({ message: 'code는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'Kakao 인가 코드는 필수값입니다' })
  code: string;

  /**
   * 리다이렉트 URI - 인가코드 요청 시 사용한 것과 동일한 URI
   * Kakao token API 호출 시 redirect_uri 파라미터로 전달 (검증용)
   */
  @ApiProperty({ description: '리다이렉트 URI (인가코드 요청 시 사용한 것과 동일)' })
  @IsString({ message: 'redirectUri는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'redirectUri는 필수값입니다' })
  redirectUri: string;
}
