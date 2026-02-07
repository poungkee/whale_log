/**
 * @file roles.guard.ts
 * @description 역할(Role) 기반 접근 제어 가드 - RBAC(Role-Based Access Control)
 *
 * @Roles() 데코레이터로 지정된 역할을 가진 사용자만 해당 엔드포인트에 접근할 수 있도록 제어합니다.
 * FirebaseAuthGuard 이후에 실행되며, request.user에서 사용자 역할을 확인합니다.
 *
 * 동작 흐름:
 * 1. @Roles() 데코레이터에서 필요한 역할 목록을 조회
 * 2. 역할이 지정되지 않은 엔드포인트는 모든 인증된 사용자 접근 허용
 * 3. 사용자의 역할이 필요한 역할 목록에 포함되는지 확인
 * 4. 역할이 없으면 403 Forbidden 에러 반환
 *
 * @example
 * @Roles(Role.ADMIN)   // 관리자만 접근 가능
 * @Delete('users/:id')
 * suspendUser() { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

/**
 * @class RolesGuard
 * @description 사용자 역할을 확인하여 권한이 있는 사용자만 접근을 허용하는 가드
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
