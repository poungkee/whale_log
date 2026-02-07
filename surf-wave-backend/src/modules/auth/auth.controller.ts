/**
 * @file auth.controller.ts
 * @description 인증 컨트롤러 - 회원가입, 로그인, 회원탈퇴 API 엔드포인트
 *
 * 엔드포인트 목록:
 * - POST /api/v1/auth/register  : 회원가입 (공개)
 * - POST /api/v1/auth/login     : 로그인 (공개)
 * - DELETE /api/v1/auth/withdraw : 회원탈퇴 (인증 필요)
 */

import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register - 회원가입
   * Firebase 토큰과 닉네임을 받아 새로운 사용자를 생성합니다.
   * @Public() - 인증 없이 접근 가능
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user with Firebase token' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login - 로그인
   * Firebase 토큰을 검증하고 해당 사용자 정보를 반환합니다.
   * @Public() - 인증 없이 접근 가능
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Firebase token' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * DELETE /auth/withdraw - 회원탈퇴
   * 현재 로그인한 사용자의 계정을 소프트 삭제합니다.
   * 인증 필요 (Bearer 토큰)
   */
  @Delete('withdraw')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw user account (soft delete)' })
  async withdraw(@CurrentUser() user: User) {
    return this.authService.withdraw(user.id);
  }
}
