/**
 * @file current-user.decorator.ts
 * @description 현재 로그인한 사용자 정보를 컨트롤러 메서드 파라미터로 주입하는 커스텀 데코레이터
 *
 * JWT 인증 가드(FirebaseAuthGuard)에서 토큰 검증 후 request.user에 저장한 페이로드를
 * 컨트롤러에서 간편하게 사용할 수 있도록 변환합니다.
 *
 * JWT 페이로드 원본: { sub: UUID, email: string, role: string, iat: number, exp: number }
 * 변환 후 RequestUser: { id: UUID, email: string, role: string }
 *
 * @example
 * // 전체 사용자 정보 가져오기
 * @Get('profile')
 * getProfile(@CurrentUser() user: RequestUser) {
 *   console.log(user.id); // 사용자 UUID
 * }
 *
 * // 특정 필드만 가져오기
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) {
 *   console.log(userId); // 사용자 UUID
 * }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 요청에 포함된 인증된 사용자 정보 인터페이스
 *
 * JWT 토큰의 페이로드에서 추출한 핵심 사용자 정보
 * - id: 사용자 UUID (JWT의 'sub' 필드에서 매핑)
 * - email: 사용자 이메일
 * - role: 사용자 역할 ('USER' | 'ADMIN')
 */
export interface RequestUser {
  id: string;       // 사용자 UUID (JWT의 sub에서 매핑)
  email?: string;   // 사용자 이메일
  role?: string;    // 사용자 역할 (USER | ADMIN)
}

/**
 * @decorator CurrentUser
 * @description HTTP 요청의 JWT 페이로드에서 현재 인증된 사용자 정보를 추출하는 파라미터 데코레이터
 *
 * JWT 페이로드의 'sub' 필드를 'id'로 매핑하여 사용하기 쉬운 형태로 변환합니다.
 *
 * @param data - 특정 필드명을 전달하면 해당 필드 값만 반환, 미전달 시 전체 RequestUser 객체 반환
 * @returns RequestUser 객체 또는 지정한 필드의 값
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    /** request.user는 FirebaseAuthGuard에서 JWT 검증 후 저장한 페이로드 */
    const jwtPayload = request.user;

    if (!jwtPayload) {
      return undefined;
    }

    /**
     * JWT 페이로드를 RequestUser 형태로 변환
     * sub → id 매핑 (JWT 표준 클레임 'sub'을 앱 내부의 'id'로 변환)
     */
    const user: RequestUser = {
      id: jwtPayload.sub,      // JWT의 sub(subject) = 사용자 UUID
      email: jwtPayload.email,
      role: jwtPayload.role,
    };

    /** data가 지정되면 해당 필드만 반환, 아니면 전체 user 객체 반환 */
    return data ? user[data] : user;
  },
);
