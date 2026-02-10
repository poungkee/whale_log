/**
 * @file login.dto.ts
 * @description 로그인 요청 DTO - 이메일/비밀번호 기반 일반 로그인 시 필요한 데이터
 *
 * 유효성 검증 규칙:
 * - email: 이메일 형식 필수
 * - password: 빈 문자열이 아닌 문자열
 *
 * 사용처: POST /api/v1/auth/login
 */

import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  /** 사용자 이메일 - 회원가입 시 등록한 이메일 */
  @ApiProperty({ description: '사용자 이메일', example: 'surfer@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다' })
  email: string;

  /** 비밀번호 - DB에 저장된 bcrypt 해시와 비교 */
  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다' })
  @IsNotEmpty({ message: '비밀번호는 필수 입력값입니다' })
  password: string;
}
