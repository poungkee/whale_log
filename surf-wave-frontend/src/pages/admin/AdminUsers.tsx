/**
 * @file AdminUsers.tsx
 * @description 관리자 유저 관리 탭 — 유저 목록 조회, 검색/필터, 정지/해제, 역할 변경
 *
 * API 호출:
 * - GET  /api/v1/admin/users?search=&role=&isSuspended=&page=1&limit=20
 * - PATCH /api/v1/admin/users/:id/suspend  { suspend: boolean, reason?, days? }
 * - PATCH /api/v1/admin/users/:id/role     { role: 'USER' | 'ADMIN' }
 */

import { useEffect, useState, useCallback } from 'react';
import { Search, UserX, UserCheck, Shield, User, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdminUser } from '../../types';
import { api } from '../../lib/api';

interface AdminUsersProps {
  /** JWT 액세스 토큰 — API 인증에 사용 */
  token: string;
}

/** 유저 목록 API 응답 구조 */
interface UsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 날짜 문자열을 한국 로케일 형식으로 변환
 * 예: '2026-04-12T10:30:00Z' → '2026. 4. 12.'
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export function AdminUsers({ token }: AdminUsersProps) {
  /** 유저 목록 데이터 */
  const [users, setUsers] = useState<AdminUser[]>([]);
  /** 전체 유저 수 (페이지네이션용) */
  const [total, setTotal] = useState(0);
  /** 현재 페이지 (1부터 시작) */
  const [page, setPage] = useState(1);
  /** 검색어 - 이메일/닉네임 ILIKE 검색 */
  const [search, setSearch] = useState('');
  /** 역할 필터 */
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  /** 정지 상태 필터 */
  const [suspendedFilter, setSuspendedFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  /** 로딩 상태 */
  const [loading, setLoading] = useState(false);
  /** 정지 처리 중인 유저 ID */
  const [processingId, setProcessingId] = useState<string | null>(null);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  /** 유저 목록 조회 */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (suspendedFilter !== 'ALL') params.set('isSuspended', suspendedFilter);

      const res = await fetch(api(`/api/v1/admin/users?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error('유저 목록 조회 실패:', res.status);
        return;
      }

      const data: UsersResponse = await res.json();
      setUsers(data.data);
      setTotal(data.total);
    } catch {
      console.error('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, roleFilter, suspendedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /** 검색어 변경 시 첫 페이지로 리셋 */
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  /**
   * 유저 정지/해제 처리
   * - suspend=true: 30일 정지
   * - suspend=false: 즉시 해제
   */
  const handleSuspend = async (userId: string, currentlySuspended: boolean) => {
    const action = currentlySuspended ? '정지 해제' : '30일 정지';
    if (!confirm(`이 유저를 ${action}하시겠습니까?`)) return;

    setProcessingId(userId);
    try {
      const body = currentlySuspended
        ? { suspend: false }
        : { suspend: true, days: 30, reason: '관리자 수동 정지' };

      const res = await fetch(api(`/api/v1/admin/users/${userId}/suspend`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        /** 성공 시 해당 유저 상태 즉시 업데이트 (낙관적 업데이트) */
        setUsers(prev =>
          prev.map(u =>
            u.id === userId
              ? { ...u, isSuspended: !currentlySuspended, suspendedUntil: currentlySuspended ? null : u.suspendedUntil }
              : u
          )
        );
      } else {
        alert(`${action} 처리에 실패했습니다.`);
      }
    } catch {
      alert('서버 연결 실패');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * 역할 변경 처리 (USER ↔ ADMIN)
   */
  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`역할을 ${newRole}로 변경하시겠습니까?`)) return;

    setProcessingId(userId);
    try {
      const res = await fetch(api(`/api/v1/admin/users/${userId}/role`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
        );
      } else {
        alert('역할 변경에 실패했습니다.');
      }
    } catch {
      alert('서버 연결 실패');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">유저 관리</h2>
        <span className="text-sm text-muted-foreground">총 {total.toLocaleString('ko-KR')}명</span>
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-2">
        {/* 검색 입력 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="이메일 또는 닉네임 검색"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* 필터 버튼 그룹 */}
        <div className="flex gap-2">
          {/* 역할 필터 */}
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value as typeof roleFilter); setPage(1); }}
            className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">전체 역할</option>
            <option value="USER">일반 유저</option>
            <option value="ADMIN">관리자</option>
          </select>

          {/* 정지 상태 필터 */}
          <select
            value={suspendedFilter}
            onChange={e => { setSuspendedFilter(e.target.value as typeof suspendedFilter); setPage(1); }}
            className="flex-1 px-3 py-1.5 bg-card border border-border rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">정지 전체</option>
            <option value="true">정지됨</option>
            <option value="false">정상</option>
          </select>
        </div>
      </div>

      {/* 유저 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          검색 결과가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.id}
              className={`bg-card border rounded-xl p-4 ${
                user.isSuspended ? 'border-red-500/30' : 'border-border'
              }`}
            >
              {/* 유저 기본 정보 */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 닉네임 */}
                    <span className="font-medium text-sm truncate">{user.nickname}</span>
                    {/* 역할 배지 */}
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                        <Shield className="w-3 h-3" />
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary text-muted-foreground rounded text-xs">
                        <User className="w-3 h-3" />
                        USER
                      </span>
                    )}
                    {/* 정지 배지 */}
                    {user.isSuspended && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        정지됨
                      </span>
                    )}
                  </div>
                  {/* 이메일 */}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  {/* 날짜 정보 */}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>가입: {formatDate(user.createdAt)}</span>
                    <span>마지막 로그인: {formatDate(user.lastLoginAt)}</span>
                  </div>
                  {/* 정지 만료일 */}
                  {user.isSuspended && user.suspendedUntil && (
                    <p className="text-xs text-red-400 mt-0.5">
                      정지 해제: {formatDate(user.suspendedUntil)}
                    </p>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {/* 정지/해제 버튼 */}
                  <button
                    onClick={() => handleSuspend(user.id, user.isSuspended)}
                    disabled={processingId === user.id}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      user.isSuspended
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    } disabled:opacity-50`}
                  >
                    {user.isSuspended ? (
                      <><UserCheck className="w-3 h-3" /> 해제</>
                    ) : (
                      <><UserX className="w-3 h-3" /> 정지</>
                    )}
                  </button>

                  {/* 역할 변경 버튼 */}
                  <button
                    onClick={() => handleRoleChange(user.id, user.role)}
                    disabled={processingId === user.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
                               bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    <Shield className="w-3 h-3" />
                    {user.role === 'ADMIN' ? '→USER' : '→ADMIN'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
