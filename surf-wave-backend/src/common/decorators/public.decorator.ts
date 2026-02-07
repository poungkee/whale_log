/**
 * @file public.decorator.ts
 * @description 인증 없이 접근 가능한 공개(Public) 엔드포인트를 지정하는 데코레이터
 *
 * FirebaseAuthGuard는 기본적으로 모든 엔드포인트에 인증을 요구합니다.
 * 이 @Public() 데코레이터를 붙이면 해당 엔드포인트는 인증 없이 접근할 수 있습니다.
 *
 * @example
 * @Public()
 * @Get('spots')
 * getAllSpots() { ... } // 비로그인 사용자도 서핑 스팟 목록 조회 가능
 */

import { SetMetadata } from '@nestjs/common';

/** 메타데이터 키 - FirebaseAuthGuard에서 이 키를 확인하여 공개 여부 판단 */
export const IS_PUBLIC_KEY = 'isPublic';

/** @Public 데코레이터 - 엔드포인트에 isPublic=true 메타데이터를 설정 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
