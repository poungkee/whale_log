/**
 * @file current-user.decorator.ts
 * @description 현재 로그인한 사용자 정보를 컨트롤러 메서드 파라미터로 주입하는 커스텀 데코레이터
 *
 * Firebase Auth Guard에서 검증된 사용자 정보를 request.user에 저장한 후,
 * 이 데코레이터를 사용하면 컨트롤러에서 간편하게 사용자 정보에 접근할 수 있습니다.
 *
 * @example
 * // 전체 사용자 객체 가져오기
 * @Get('profile')
 * getProfile(@CurrentUser() user: RequestUser) { ... }
 *
 * // 특정 필드만 가져오기
 * @Get('profile')
 * getProfile(@CurrentUser('uid') uid: string) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 요청에 포함된 인증된 사용자 정보 인터페이스 */
export interface RequestUser {
  uid: string;       // Firebase UID (사용자 고유 식별자)
  email?: string;    // 사용자 이메일 (선택적)
  role?: string;     // 사용자 역할 (USER, ADMIN)
}

/**
 * @decorator CurrentUser
 * @description HTTP 요청의 request.user에서 현재 인증된 사용자 정보를 추출하는 파라미터 데코레이터
 * @param data - 특정 필드명을 전달하면 해당 필드 값만 반환, 미전달 시 전체 RequestUser 객체 반환
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      return undefined;
    }

    /** data가 지정되면 해당 필드만 반환, 아니면 전체 user 객체 반환 */
    return data ? user[data] : user;
  },
);
