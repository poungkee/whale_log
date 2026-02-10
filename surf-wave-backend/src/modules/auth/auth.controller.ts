/**
 * @file auth.controller.ts
 * @description 인증 컨트롤러 - 회원가입, 로그인, 소셜 로그인, 회원탈퇴 API 엔드포인트
 *
 * API 엔드포인트 목록:
 * - POST /api/v1/auth/register  → 이메일/비밀번호 회원가입 (공개)
 * - POST /api/v1/auth/login     → 이메일/비밀번호 로그인 (공개)
 * - POST /api/v1/auth/google    → Google 소셜 로그인 (공개)
 * - POST /api/v1/auth/kakao     → Kakao 소셜 로그인 (공개)
 * - DELETE /api/v1/auth/withdraw → 회원탈퇴 (인증 필요)
 *
 * @Public() 데코레이터가 붙은 엔드포인트는 JWT 인증 없이 접근 가능
 * 회원탈퇴만 JWT 토큰이 필요 (Authorization: Bearer {token})
 */

import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto, KakaoLoginDto, KakaoCallbackDto } from './dto/social-login.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth') // Swagger 문서에서 'auth' 그룹으로 분류
@Controller('auth') // 기본 경로: /api/v1/auth (글로벌 prefix + 컨트롤러 경로)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 이메일/비밀번호 회원가입
   *
   * 요청 Body: { email: string, password: string, nickname: string }
   * 응답: { accessToken: JWT문자열, user: { id, email, nickname, ... } }
   *
   * 에러 응답:
   * - 409 Conflict: 이메일 또는 닉네임 중복
   * - 400 Bad Request: 유효성 검증 실패 (이메일 형식, 비밀번호 6자 미만 등)
   */
  @Public() // JWT 인증 없이 접근 가능
  @Post('register')
  @ApiOperation({ summary: '이메일/비밀번호 회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공 - JWT 토큰과 사용자 정보 반환' })
  @ApiResponse({ status: 409, description: '이메일 또는 닉네임 중복' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 이메일/비밀번호 로그인
   *
   * 요청 Body: { email: string, password: string }
   * 응답: { accessToken: JWT문자열, user: { id, email, nickname, ... } }
   *
   * 에러 응답:
   * - 401 Unauthorized: 이메일 미존재, 비밀번호 불일치, 정지된 계정
   */
  @Public() // JWT 인증 없이 접근 가능
  @Post('login')
  @HttpCode(HttpStatus.OK) // 로그인은 리소스 생성이 아니므로 200 반환 (기본 POST는 201)
  @ApiOperation({ summary: '이메일/비밀번호 로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공 - JWT 토큰과 사용자 정보 반환' })
  @ApiResponse({ status: 401, description: '인증 실패 (이메일 미존재, 비밀번호 불일치, 계정 정지)' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Google 소셜 로그인/회원가입
   *
   * 요청 Body: { credential: Google_ID_토큰, nickname?: 닉네임 }
   * 응답: { accessToken: JWT문자열, user: { id, email, nickname, ... } }
   *
   * 처리: Google tokeninfo API로 ID 토큰 검증 → 기존 사용자면 로그인, 새 사용자면 자동 가입
   */
  @Public() // JWT 인증 없이 접근 가능
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google 소셜 로그인/회원가입' })
  @ApiResponse({ status: 200, description: 'Google 로그인 성공' })
  @ApiResponse({ status: 401, description: 'Google 토큰 검증 실패' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.credential, dto.nickname);
  }

  /**
   * Kakao 소셜 로그인/회원가입
   *
   * 요청 Body: { accessToken: Kakao_액세스_토큰, nickname?: 닉네임 }
   * 응답: { accessToken: JWT문자열, user: { id, email, nickname, ... } }
   *
   * 처리: Kakao user/me API로 사용자 정보 조회 → 기존 사용자면 로그인, 새 사용자면 자동 가입
   */
  @Public() // JWT 인증 없이 접근 가능
  @Post('kakao')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kakao 소셜 로그인/회원가입' })
  @ApiResponse({ status: 200, description: 'Kakao 로그인 성공' })
  @ApiResponse({ status: 401, description: 'Kakao 토큰 검증 실패 또는 이메일 미제공' })
  async kakaoLogin(@Body() dto: KakaoLoginDto) {
    return this.authService.kakaoLogin(dto.accessToken, dto.nickname);
  }

  /**
   * Kakao 인가코드 콜백 - 인가코드를 액세스 토큰으로 교환 후 로그인 처리
   *
   * 요청 Body: { code: 인가코드문자열, redirectUri: 리다이렉트URI }
   * 응답: { accessToken: JWT문자열, user: { id, email, nickname, ... } }
   *
   * 처리 순서:
   * 1. Kakao token API로 인가코드 → 액세스 토큰 교환
   * 2. 기존 kakaoLogin() 메서드로 사용자 인증/가입 처리
   */
  @Public() // JWT 인증 없이 접근 가능
  @Post('kakao/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kakao 인가코드 콜백 - 코드로 로그인 처리' })
  @ApiResponse({ status: 200, description: 'Kakao 로그인 성공' })
  @ApiResponse({ status: 401, description: 'Kakao 인가코드 검증 실패 또는 이메일 미제공' })
  async kakaoCallback(@Body() dto: KakaoCallbackDto) {
    return this.authService.kakaoLoginWithCode(dto.code, dto.redirectUri);
  }

  /**
   * 회원탈퇴 (소프트 삭제)
   *
   * 인증 필요: Authorization 헤더에 JWT 토큰 필수
   * 요청: DELETE /api/v1/auth/withdraw (Body 없음)
   * 응답: { message: '회원탈퇴가 완료되었습니다' }
   *
   * JWT 토큰에서 req.user.sub (사용자 UUID)를 추출하여 해당 계정 소프트 삭제
   */
  @Delete('withdraw')
  @ApiBearerAuth() // Swagger에서 인증 필요 표시
  @ApiOperation({ summary: '회원탈퇴 (소프트 삭제)' })
  @ApiResponse({ status: 200, description: '회원탈퇴 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 요청' })
  async withdraw(@Request() req: any) {
    /** req.user는 FirebaseAuthGuard에서 JWT 검증 후 설정한 페이로드 */
    return this.authService.withdraw(req.user.sub);
  }
}
