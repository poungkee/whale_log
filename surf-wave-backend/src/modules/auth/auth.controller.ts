/**
 * @file auth.controller.ts
 * @description 인증 컨트롤러
 *
 * API 엔드포인트:
 * - POST /auth/check-username   → 아이디 중복 확인 (공개)
 * - POST /auth/register         → 회원가입 (공개)
 * - POST /auth/login            → 아이디/비밀번호 로그인 (공개)
 * - POST /auth/forgot-password  → 비밀번호 찾기 인증코드 발송 (공개)
 * - POST /auth/reset-password   → 비밀번호 재설정 (공개)
 * - POST /auth/google           → Google 소셜 로그인 (공개, 웹앱용 ID 토큰)
 * - POST /auth/google/callback  → Google 인가코드 콜백 (공개, 모바일용)
 * - POST /auth/kakao            → Kakao 소셜 로그인 (공개)
 * - POST /auth/kakao/callback   → Kakao 인가코드 콜백 (공개)
 * - GET  /auth/kakao/mobile-callback → Kakao 모바일 딥링크 콜백 (공개)
 * - DELETE /auth/withdraw       → 회원탈퇴 (인증 필요)
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto, CheckUsernameDto } from './dto/password-reset.dto';
import { GoogleLoginDto, GoogleCallbackDto, KakaoLoginDto, KakaoCallbackDto } from './dto/social-login.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { ttl: 60000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 아이디 중복 확인
   * 회원가입 전 "중복 확인" 버튼 클릭 시 호출
   */
  @Public()
  @Post('check-username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '아이디 중복 확인' })
  @ApiResponse({ status: 200, description: '{ available: true } 또는 { available: false }' })
  async checkUsername(@Body() dto: CheckUsernameDto) {
    return this.authService.checkUsername(dto.username);
  }

  /**
   * 회원가입 (아이디 + 이메일 + 비밀번호 + 닉네임)
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공 - JWT 토큰과 사용자 정보 반환' })
  @ApiResponse({ status: 409, description: '아이디/이메일/닉네임 중복' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 아이디/비밀번호 로그인
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '아이디/비밀번호 로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공 - JWT 토큰과 사용자 정보 반환' })
  @ApiResponse({ status: 401, description: '아이디 미존재, 비밀번호 불일치, 계정 정지' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 비밀번호 찾기 - 이메일로 인증코드 발송
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 1분에 3회로 제한 (이메일 남발 방지)
  @ApiOperation({ summary: '비밀번호 찾기 - 이메일로 인증코드 발송' })
  @ApiResponse({ status: 200, description: '인증코드 발송 완료' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * 비밀번호 재설정 - 인증코드 확인 후 새 비밀번호 설정
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 - 인증코드 + 새 비밀번호' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 완료' })
  @ApiResponse({ status: 400, description: '인증코드 만료 또는 불일치' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /** Google 소셜 로그인 */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google 소셜 로그인/회원가입' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.credential);
  }

  /** Google 인가코드 콜백 (모바일 앱용) */
  @Public()
  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google 인가코드 콜백 (모바일 앱용)' })
  async googleCallback(@Body() dto: GoogleCallbackDto) {
    return this.authService.googleLoginWithCode(dto.code, dto.redirectUri);
  }

  /** Kakao 소셜 로그인 */
  @Public()
  @Post('kakao')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kakao 소셜 로그인/회원가입' })
  async kakaoLogin(@Body() dto: KakaoLoginDto) {
    return this.authService.kakaoLogin(dto.accessToken);
  }

  /** Kakao 인가코드 콜백 */
  @Public()
  @Post('kakao/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kakao 인가코드 콜백' })
  async kakaoCallback(@Body() dto: KakaoCallbackDto) {
    return this.authService.kakaoLoginWithCode(dto.code, dto.redirectUri);
  }

  /**
   * Kakao 모바일 앱 OAuth 콜백 (GET) — 출시 빌드용
   * Kakao → 이 엔드포인트로 리다이렉트 → JWT 발급 후 앱 딥링크로 이동
   */
  @Public()
  @Get('kakao/mobile-callback')
  @ApiOperation({ summary: 'Kakao 모바일 인가코드 콜백 (딥링크 리다이렉트)' })
  async kakaoMobileCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    if (error || !code) {
      return res.redirect(`whalelog://oauth?error=${error || 'no_code'}`);
    }
    try {
      const MOBILE_REDIRECT = 'https://whalelog-production.up.railway.app/api/v1/auth/kakao/mobile-callback';
      const result = await this.authService.kakaoLoginWithCode(code, MOBILE_REDIRECT);
      const token = encodeURIComponent(result.accessToken);
      const user = encodeURIComponent(JSON.stringify(result.user));
      return res.redirect(`whalelog://oauth?token=${token}&user=${user}`);
    } catch (e) {
      return res.redirect(`whalelog://oauth?error=auth_failed`);
    }
  }

  /**
   * Google 모바일 앱 OAuth 콜백 (GET)
   * Google → 이 엔드포인트로 리다이렉트 → JWT 발급 후 앱 딥링크로 이동
   */
  @Public()
  @Get('google/mobile-callback')
  @ApiOperation({ summary: 'Google 모바일 인가코드 콜백 (딥링크 리다이렉트)' })
  async googleMobileCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    if (error || !code) {
      return res.redirect(`whalelog://oauth?error=${error || 'no_code'}`);
    }
    try {
      const MOBILE_REDIRECT = 'https://whalelog-production.up.railway.app/api/v1/auth/google/mobile-callback';
      const result = await this.authService.googleLoginWithCode(code, MOBILE_REDIRECT);
      const token = encodeURIComponent(result.accessToken);
      const user = encodeURIComponent(JSON.stringify(result.user));
      return res.redirect(`whalelog://oauth?token=${token}&user=${user}`);
    } catch (e) {
      return res.redirect(`whalelog://oauth?error=auth_failed`);
    }
  }

  /** 회원탈퇴 */
  @Delete('withdraw')
  @ApiBearerAuth()
  @ApiOperation({ summary: '회원탈퇴 (소프트 삭제)' })
  async withdraw(@Request() req: any) {
    return this.authService.withdraw(req.user.sub);
  }
}
