/**
 * @file password-reset.dto.ts
 * @description 비밀번호 찾기 관련 DTO
 *
 * - ForgotPasswordDto: 이메일 입력 → 인증코드 발송 요청
 * - ResetPasswordDto: 인증코드 + 새 비밀번호로 재설정 요청
 */

import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';
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

/** 아이디 중복 확인 요청 DTO */
export class CheckUsernameDto {
  @ApiProperty({ description: '중복 확인할 아이디', example: 'surfer_kim' })
  @IsString()
  @IsNotEmpty({ message: '아이디는 필수 입력값입니다' })
  username: string;
}
