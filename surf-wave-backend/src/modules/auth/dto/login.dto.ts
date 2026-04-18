/**
 * @file login.dto.ts
 * @description 로그인 요청 DTO - 아이디/비밀번호 기반 로그인 시 필요한 데이터
 *
 * 유효성 검증 규칙:
 * - username: 빈 문자열이 아닌 문자열 (아이디)
 * - password: 빈 문자열이 아닌 문자열
 *
 * 사용처: POST /api/v1/auth/login
 */

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  /** 로그인 아이디 - 회원가입 시 등록한 아이디 */
  @ApiProperty({ description: '로그인 아이디', example: 'surfer_kim' })
  @IsString({ message: '아이디는 문자열이어야 합니다' })
  @IsNotEmpty({ message: '아이디는 필수 입력값입니다' })
  username: string;

  /** 비밀번호 - DB에 저장된 bcrypt 해시와 비교 */
  @ApiProperty({ description: '비밀번호', example: 'Surfer2026!' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다' })
  @IsNotEmpty({ message: '비밀번호는 필수 입력값입니다' })
  password: string;
}
