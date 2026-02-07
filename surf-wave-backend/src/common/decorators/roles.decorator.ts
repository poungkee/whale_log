/**
 * @file roles.decorator.ts
 * @description 특정 역할(Role)을 가진 사용자만 접근할 수 있도록 제한하는 데코레이터
 *
 * RolesGuard와 함께 사용되며, 지정된 역할을 가진 사용자만 해당 엔드포인트에 접근 가능합니다.
 *
 * @example
 * @Roles(Role.ADMIN)
 * @Delete('users/:id')
 * suspendUser() { ... } // ADMIN 역할만 사용자 제재 가능
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/** 메타데이터 키 - RolesGuard에서 이 키를 확인하여 역할 검증 */
export const ROLES_KEY = 'roles';

/** @Roles 데코레이터 - 엔드포인트에 필요한 역할 목록을 메타데이터로 설정 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
