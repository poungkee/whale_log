/**
 * @file password-reset.dto.ts
 * @description 비밀번호 찾기 관련 DTO
 *
 * - ForgotPasswordDto: 이메일 입력 → 인증코드 발송 요청
 * - ResetPasswordDto: 인증코드 + 새 비밀번호로 재설정 요청
 */

import { IsEmail, IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 비밀번호 찾기 - 이메일로 인증코드 발송 요청 */
export class ForgotPasswordDto {
  @ApiProperty({ description: '가입 시 등록한 이메일', example: 'surfer@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다' })
  email: string;
}

/** 비밀번호 재설정 - 인증코드 + 새 비밀번호 */
export class ResetPasswordDto {
  @ApiProperty({ description: '가입 시 등록한 이메일', example: 'surfer@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다' })
  email: string;

  /** 이메일로 받은 6자리 인증코드 */
  @ApiProperty({ description: '이메일로 받은 6자리 인증코드', example: '123456' })
  @IsString()
  @Length(6, 6, { message: '인증코드는 6자리입니다' })
  code: string;

  /** 새 비밀번호 - 최소 8자, 영문+숫자 조합 */
  @ApiProperty({ description: '새 비밀번호 (최소 8자, 영문+숫자 조합)', example: 'NewSurfer2026!' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message: '비밀번호는 영문과 숫자를 모두 포함해야 합니다',
  })
  newPassword: string;
}

/**
 * 아이디 중복 확인 요청 DTO
 * register.dto.ts와 동일한 검증 규칙 적용 — 길이 + 정규식
 * (이전엔 길이 검증 없어서 1글자 username도 available:true 반환되던 이슈)
 */
export class CheckUsernameDto {
  @ApiProperty({ description: '중복 확인할 아이디', example: 'surfer_kim', minLength: 2, maxLength: 15 })
  @IsString()
  @IsNotEmpty({ message: '아이디는 필수 입력값입니다' })
  @MinLength(2, { message: '아이디는 최소 2자 이상이어야 합니다' })
  @MaxLength(15, { message: '아이디는 최대 15자까지 가능합니다' })
  @Matches(/^[a-zA-Z0-9_가-힣]+$/, {
    message: '아이디는 한글, 영문, 숫자, 언더스코어(_)만 사용 가능합니다',
  })
  username: string;
}
