/**
 * @file AdminOverview.tsx
 * @description 관리자 대시보드 개요 탭 — 핵심 지표 카드 + 7일 트래픽 차트
 *
 * API 호출:
 * - GET /api/v1/admin/dashboard → AdminStats (총 유저, 신규 유저, 활성 유저, 스팟 수 등)
 * - GET /api/v1/admin/stats/traffic → TrafficDay[] (7일 일별 신규/활성/다이어리/게시글)
 *
 * 차트 라이브러리: Recharts (이미 설치됨)
 */

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Users, Activity, MapPin, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import type { AdminStats, TrafficDay } from '../../types';
import { api } from '../../lib/api';

interface AdminOverviewProps {
  /** JWT 액세스 토큰 — API 인증에 사용 */
  token: string;
}

/**
 * 숫자를 읽기 좋은 형식으로 포맷 (예: 1234 → 1,234)
 */
function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

/**
 * 날짜 문자열을 짧은 형식으로 변환 (예: '2026-04-12' → '4/12')
 */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function AdminOverview({ token }: AdminOverviewProps) {
  /** 대시보드 통계 데이터 */
  const [stats, setStats] = useState<AdminStats | null>(null);
  /** 7일 트래픽 데이터 배열 */
  const [traffic, setTraffic] = useState<TrafficDay[]>([]);
  /** 로딩 상태 */
  const [loading, setLoading] = useState(true);
  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /** 대시보드 통계 + 트래픽 데이터 병렬 조회 */
    const fetchAll = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [statsRes, trafficRes] = await Promise.all([
          fetch(api('/api/v1/admin/dashboard'), { headers }),
          fetch(api('/api/v1/admin/stats/traffic'), { headers }),
        ]);

        if (!statsRes.ok || !trafficRes.ok) {
          setError('데이터 조회에 실패했습니다. 권한을 확인하세요.');
          return;
        }

        const statsData: AdminStats = await statsRes.json();
        const trafficData: TrafficDay[] = await trafficRes.json();

        setStats(statsData);
        /** 날짜 오름차순 정렬 + shortDate 라벨 추가 */
        setTraffic(
          trafficData
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ ...d, label: shortDate(d.date) }))
        );
      } catch {
        setError('서버 연결 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <AlertTriangle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  /** 통계 카드 정의 */
  const statCards = [
    { label: '전체 유저', value: Number(stats?.totalUsers ?? 0), icon: Users, color: 'text-blue-400' },
    { label: '이번 주 신규', value: Number(stats?.newUsersThisWeek ?? 0), icon: TrendingUp, color: 'text-green-400' },
    { label: '오늘 활성 유저', value: Number(stats?.activeUsersToday ?? 0), icon: Activity, color: 'text-cyan-400' },
    { label: '정지된 유저', value: Number(stats?.suspendedUsers ?? 0), icon: AlertTriangle, color: 'text-red-400' },
    { label: '전체 스팟', value: Number(stats?.totalSpots ?? 0), icon: MapPin, color: 'text-yellow-400' },
    { label: '전체 게시글', value: Number(stats?.totalPosts ?? 0), icon: FileText, color: 'text-purple-400' },
    { label: '전체 다이어리', value: Number(stats?.totalDiaries ?? 0), icon: FileText, color: 'text-orange-400' },
    { label: '미처리 신고', value: Number(stats?.pendingReports ?? 0), icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">대시보드 개요</h2>

      {/* 통계 카드 그리드 — 2열 4행 */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold">{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* 7일 트래픽 차트 */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          최근 7일 트래픽
        </h3>

        {traffic.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">트래픽 데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={traffic} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2332',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              {/* 신규 가입자 — 초록색 */}
              <Line
                type="monotone"
                dataKey="newUsers"
                name="신규 가입"
                stroke="#4ade80"
                strokeWidth={2}
                dot={{ r: 3, fill: '#4ade80' }}
                activeDot={{ r: 5 }}
              />
              {/* 일별 활성 유저 (DAU) — 시안색 */}
              <Line
                type="monotone"
                dataKey="activeUsers"
                name="활성 유저"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ r: 3, fill: '#22d3ee' }}
                activeDot={{ r: 5 }}
              />
              {/* 신규 다이어리 — 오렌지 */}
              <Line
                type="monotone"
                dataKey="newDiaries"
                name="다이어리"
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fb923c' }}
                activeDot={{ r: 5 }}
              />
              {/* 신규 게시글 — 보라색 */}
              <Line
                type="monotone"
                dataKey="newPosts"
                name="게시글"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ r: 3, fill: '#a78bfa' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
