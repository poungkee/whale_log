/**
 * @file AdminPage.tsx
 * @description 관리자 대시보드 메인 셸 — 탭 네비게이션 + 각 탭 컴포넌트 렌더링
 *
 * 탭 구성:
 * - 개요(overview): 핵심 통계 카드 + 7일 트래픽 차트
 * - 유저(users): 유저 목록/검색/필터 + 정지/역할 변경
 * - 스팟(spots): 스팟 CRUD (생성/수정/삭제)
 * - 감사로그(logs): 관리자 액션 이력
 *
 * 진입 조건: role=ADMIN인 사용자만 App.tsx에서 이 화면으로 보냄
 * 토큰: localStorage에서 직접 읽음 (App.tsx에서 prop으로 내려주지 않음)
 */

import { useState } from 'react';
import { ArrowLeft, LayoutDashboard, Users, MapPin, BookOpen, ScrollText, Flag } from 'lucide-react';
import type { UserInfo, AdminTab } from '../../types';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminSpots } from './AdminSpots';
import { AdminGuides } from './AdminGuides';
import { AdminLogs } from './AdminLogs';
import { AdminReports } from './AdminReports';

interface AdminPageProps {
  /** 현재 로그인된 관리자 정보 */
  userInfo: UserInfo | null;
  /** 뒤로가기 핸들러 — 메인 화면으로 돌아감 */
  onBack: () => void;
}

/** 탭 정의 목록 */
const TABS: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: '개요',   icon: LayoutDashboard },
  { id: 'users',    label: '유저',   icon: Users },
  { id: 'reports',  label: '신고',   icon: Flag },
  { id: 'spots',    label: '스팟',   icon: MapPin },
  { id: 'guides',   label: '가이드', icon: BookOpen },
  { id: 'logs',     label: '로그',   icon: ScrollText },
];

export function AdminPage({ userInfo, onBack }: AdminPageProps) {
  /** 현재 활성 탭 */
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  /** localStorage에서 JWT 토큰 가져오기 — API 인증에 사용 */
  const token = localStorage.getItem('accessToken') ?? '';

  /** 탭별 컴포넌트 렌더링 */
  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview token={token} />;
      case 'users':    return <AdminUsers token={token} />;
      case 'reports':  return <AdminReports token={token} />;
      case 'spots':    return <AdminSpots token={token} />;
      case 'guides':   return <AdminGuides token={token} />;
      case 'logs':     return <AdminLogs token={token} />;
      default:         return <AdminOverview token={token} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 헤더 — 뒤로가기 버튼 + 타이틀 + 관리자 닉네임 */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label="메인 화면으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* 타이틀 */}
          <div className="flex-1">
            <h1 className="text-base font-bold text-red-400">관리자 패널</h1>
            {userInfo && (
              <p className="text-xs text-muted-foreground">{userInfo.username || '관리자'} · ADMIN</p>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 — 스크롤 가능한 가로 탭 바 */}
        <nav className="flex border-t border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                activeTab === id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* 탭 컨텐츠 */}
      <main className="flex-1 px-4 py-4 pb-8 overflow-y-auto">
        {renderTab()}
      </main>
    </div>
  );
}
