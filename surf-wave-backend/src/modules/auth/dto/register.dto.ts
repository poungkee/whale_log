/**
 * @file register.dto.ts
 * @description 회원가입 요청 DTO - 이메일/비밀번호 기반 일반 회원가입 시 필요한 데이터
 *
 * 유효성 검증 규칙:
 * - email: 이메일 형식 필수 (예: user@example.com)
 * - password: 최소 6자 이상 문자열
 * - nickname: 2~30자 문자열 (서비스 내 표시 이름, 고유값)
 *
 * 사용처: POST /api/v1/auth/register
 */

import { IsString, IsNotEmpty, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  /** 사용자 이메일 - 로그인 ID로 사용, users 테이블에서 unique */
  @ApiProperty({ description: '사용자 이메일', example: 'surfer@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다' })
  email: string;

  /** 비밀번호 - bcrypt로 해싱되어 password_hash 컬럼에 저장 */
  @ApiProperty({ description: '비밀번호 (최소 6자)', minLength: 6, example: 'password123' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다' })
  password: string;

  /** 닉네임 - 서비스 내 표시 이름, users 테이블에서 unique */
  @ApiProperty({ description: '닉네임 (2~30자)', minLength: 2, maxLength: 30, example: '서핑초보' })
  @IsString({ message: '닉네임은 문자열이어야 합니다' })
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다' })
  @MaxLength(30, { message: '닉네임은 최대 30자까지 가능합니다' })
  nickname: string;
}
