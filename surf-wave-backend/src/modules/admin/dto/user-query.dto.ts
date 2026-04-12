/**
 * @file user-query.dto.ts
 * @description 관리자 사용자 목록 조회 쿼리 DTO (P1-3 추가)
 *
 * 기존 PaginationDto만 사용하던 것에서 검색/필터 기능 추가
 *
 * 지원 필터:
 * - search: 이메일 또는 닉네임 부분 검색 (ILIKE)
 * - role: 역할 필터 (USER | ADMIN)
 * - isSuspended: 정지 여부 필터 (true | false)
 */
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Role } from '../../../common/enums/role.enum';

export class UserQueryDto extends PaginationDto {
  /**
   * 검색어 — 이메일 또는 닉네임에서 부분 일치 검색 (대소문자 무시)
   * 예: search=surf → 이메일/닉네임에 "surf"가 포함된 사용자 조회
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * 역할 필터 — 특정 역할의 사용자만 조회
   * 예: role=ADMIN → 관리자 계정만 목록에 표시
   */
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /**
   * 정지 여부 필터 — 정지된/활성 사용자만 조회
   * 쿼리 파라미터는 문자열로 오므로 Boolean으로 변환 필요
   * 예: isSuspended=true → 현재 정지된 사용자만 표시
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isSuspended?: boolean;
}
