/**
 * @file register.dto.ts
 * @description 회원가입 요청 DTO - 이메일/비밀번호 기반 일반 회원가입 시 필요한 데이터
 *
 * 유효성 검증 규칙:
 * - email: 이메일 형식 필수 (예: user@example.com)
 * - password: 최소 8자, 영문+숫자 조합
 * - username: 2~15자 (한글/영문/숫자/언더스코어), 고유값
 *
 * 사용처: POST /api/v1/auth/register
 */

import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  /** 로그인 아이디 - 한글/영문/숫자/언더스코어 조합, 2~15자, 고유값 */
  @ApiProperty({ description: '로그인 아이디 (2~15자, 한글/영문/숫자/언더스코어)', example: 'surfer_kim' })
  @IsString({ message: '아이디는 문자열이어야 합니다' })
  @MinLength(2, { message: '아이디는 최소 2자 이상이어야 합니다' })
  @MaxLength(15, { message: '아이디는 최대 15자까지 가능합니다' })
  @Matches(/^[a-zA-Z0-9_가-힣]+$/, { message: '아이디는 한글, 영문, 숫자, 언더스코어(_)만 사용 가능합니다' })
  username: string;

  /** 사용자 이메일 - 비밀번호 찾기용 */
  @ApiProperty({ description: '사용자 이메일', example: 'surfer@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다' })
  email: string;

  /**
   * 비밀번호 - bcrypt로 해싱되어 password_hash 컬럼에 저장
   * 최소 8자, 영문+숫자 조합 필수 (앱스토어 보안 요구사항)
   */
  @ApiProperty({ description: '비밀번호 (최소 8자, 영문+숫자 조합)', minLength: 8, example: 'Surfer2026!' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message: '비밀번호는 영문과 숫자를 모두 포함해야 합니다',
  })
  password: string;

}
