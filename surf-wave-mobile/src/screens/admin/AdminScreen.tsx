// 관리자 패널 화면 — 개요/유저/스팟/로그 4탭 (role=ADMIN 전용)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LayoutDashboard, Users, MapPin, ScrollText,
  TrendingUp, Activity, FileText, AlertTriangle,
  UserX, UserCheck, Shield, User, ChevronLeft, ChevronRight,
  Search, Plus, Trash2, Edit3,
} from 'lucide-react-native';
import { api } from '../../config/api';
import { colors, spacing, typography } from '../../theme';

type AdminTab = 'overview' | 'users' | 'spots' | 'logs';

// ─── 타입 정의 ────────────────────────────────────────────
interface AdminStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeUsersToday: number;
  suspendedUsers: number;
  totalSpots: number;
  totalPosts: number;
  totalDiaries: number;
  pendingReports: number;
}

interface AdminUser {
  id: string;
  nickname: string;
  email: string;
  role: string;
  isSuspended: boolean;
  suspendedUntil: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface SpotItem {
  id: string;
  name: string;
  region: string;
  difficulty: string;
}

interface AdminLog {
  id: string;
  actionType: string;
  description: string;
  admin: { nickname: string } | null;
  createdAt: string;
}

// ─── 유틸 ────────────────────────────────────────────────
const fmtDate = (s: string | null) => {
  if (!s) return '-';
  const d = new Date(s);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};

const ACTION_LABELS: Record<string, string> = {
  SUSPEND_USER: '유저 정지', UNSUSPEND_USER: '정지 해제',
  CHANGE_ROLE: '역할 변경', HIDE_POST: '게시글 숨김',
  SHOW_POST: '게시글 노출', DELETE_SPOT: '스팟 삭제',
  RESOLVE_REPORT: '신고 처리', BROADCAST: '전체 공지',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: '초급', INTERMEDIATE: '중급', ADVANCED: '상급', EXPERT: '전문가',
};

// ─── 개요 탭 ─────────────────────────────────────────────
const OverviewTab: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;

  const cards = [
    { label: '전체 유저', value: stats?.totalUsers ?? 0, color: '#3b82f6' },
    { label: '이번 주 신규', value: stats?.newUsersThisWeek ?? 0, color: '#22c55e' },
    { label: '오늘 활성', value: stats?.activeUsersToday ?? 0, color: colors.primary },
    { label: '정지 유저', value: stats?.suspendedUsers ?? 0, color: '#ef4444' },
    { label: '전체 스팟', value: stats?.totalSpots ?? 0, color: '#eab308' },
    { label: '게시글', value: stats?.totalPosts ?? 0, color: '#a78bfa' },
    { label: '다이어리', value: stats?.totalDiaries ?? 0, color: '#fb923c' },
    { label: '미처리 신고', value: stats?.pendingReports ?? 0, color: '#ef4444' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>대시보드 개요</Text>
      <View style={styles.statsGrid}>
        {cards.map(c => (
          <View key={c.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{c.label}</Text>
            <Text style={[styles.statValue, { color: c.color }]}>
              {c.value.toLocaleString('ko-KR')}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ─── 유저 탭 ─────────────────────────────────────────────
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (search.trim()) params.search = search.trim();
      const qs = new URLSearchParams(params).toString();
      const res = await api.get(`/admin/users?${qs}`);
      const raw = res.data;
      const list: AdminUser[] = Array.isArray(raw) ? raw : (raw.data ?? []);
      const count: number = Array.isArray(raw) ? list.length : (raw.total ?? list.length);
      setUsers(list);
      setTotal(count);
    } catch {
      Alert.alert('오류', '유저 목록 조회에 실패했어요.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSuspend = async (userId: string, suspended: boolean) => {
    Alert.alert(suspended ? '정지 해제' : '30일 정지', `이 유저를 ${suspended ? '정지 해제' : '30일 정지'}할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '확인', style: suspended ? 'default' : 'destructive',
        onPress: async () => {
          setProcessingId(userId);
          try {
            const body = suspended
              ? { suspend: false }
              : { suspend: true, days: 30, reason: '관리자 수동 정지' };
            await api.patch(`/admin/users/${userId}/suspend`, body);
            setUsers(prev => prev.map(u =>
              u.id === userId ? { ...u, isSuspended: !suspended } : u
            ));
          } catch { Alert.alert('오류', '처리에 실패했어요.'); }
          finally { setProcessingId(null); }
        },
      },
    ]);
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    Alert.alert('역할 변경', `역할을 ${newRole}로 변경할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '변경',
        onPress: async () => {
          setProcessingId(userId);
          try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
          } catch { Alert.alert('오류', '역할 변경에 실패했어요.'); }
          finally { setProcessingId(null); }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 검색 */}
      <View style={styles.searchBar}>
        <Search size={15} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="이메일 또는 닉네임 검색"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={v => { setSearch(v); setPage(1); }}
        />
      </View>

      <Text style={styles.totalText}>총 {total.toLocaleString('ko-KR')}명</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          renderItem={({ item: u }) => (
            <View style={[styles.userCard, u.isSuspended && styles.userCardSuspended]}>
              <View style={styles.userLeft}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userNick}>{u.nickname}</Text>
                  {u.role === 'ADMIN'
                    ? <View style={styles.badgeAdmin}><Text style={styles.badgeAdminText}>ADMIN</Text></View>
                    : <View style={styles.badgeUser}><Text style={styles.badgeUserText}>USER</Text></View>
                  }
                  {u.isSuspended && (
                    <View style={styles.badgeSuspend}><Text style={styles.badgeSuspendText}>정지</Text></View>
                  )}
                </View>
                <Text style={styles.userEmail}>{u.email}</Text>
                <Text style={styles.userMeta}>
                  가입 {fmtDate(u.createdAt)} · 최근 로그인 {fmtDate(u.lastLoginAt)}
                </Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.userActionBtn, u.isSuspended ? styles.unsuspendBtn : styles.suspendBtn]}
                  onPress={() => handleSuspend(u.id, u.isSuspended)}
                  disabled={processingId === u.id}
                >
                  {processingId === u.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.userActionText}>{u.isSuspended ? '해제' : '정지'}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleBtn}
                  onPress={() => handleRoleChange(u.id, u.role)}
                  disabled={processingId === u.id}
                >
                  <Text style={styles.roleBtnText}>
                    {u.role === 'ADMIN' ? '→USER' : '→ADMIN'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>검색 결과 없음</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={20} color={page === 1 ? colors.border : colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageText}>{page} / {totalPages}</Text>
          <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={20} color={page === totalPages ? colors.border : colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── 스팟 탭 ─────────────────────────────────────────────
const SpotsTab: React.FC = () => {
  const [spots, setSpots] = useState<SpotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/spots')
      .then(r => {
        const raw = r.data;
        setSpots(Array.isArray(raw) ? raw : (raw.spots?.map((s: any) => s.spot) ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = spots.filter(s =>
    s.name.includes(search) || s.region.includes(search)
  );

  const handleDelete = (spotId: string, name: string) => {
    Alert.alert('스팟 삭제', `"${name}"을 삭제할까요? 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/spots/${spotId}`);
            setSpots(prev => prev.filter(s => s.id !== spotId));
          } catch { Alert.alert('오류', '스팟 삭제에 실패했어요.'); }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBar}>
        <Search size={15} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="스팟 이름 또는 지역 검색"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <Text style={styles.totalText}>총 {filtered.length}개 스팟</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          renderItem={({ item: s }) => (
            <View style={styles.spotRow}>
              <MapPin size={14} color={colors.primary} />
              <View style={styles.spotInfo}>
                <Text style={styles.spotName}>{s.name}</Text>
                <Text style={styles.spotMeta}>{s.region} · {DIFFICULTY_LABELS[s.difficulty] ?? s.difficulty}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(s.id, s.name)}
              >
                <Trash2 size={15} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── 로그 탭 ─────────────────────────────────────────────
const LogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/logs?page=${page}&limit=${LIMIT}`);
      const raw = res.data;
      const list: AdminLog[] = Array.isArray(raw) ? raw : (raw.data ?? []);
      const count: number = Array.isArray(raw) ? list.length : (raw.total ?? list.length);
      setLogs(list);
      setTotal(count);
    } catch {
      Alert.alert('오류', '로그 조회에 실패했어요.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.totalText}>총 {total.toLocaleString('ko-KR')}건</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={l => l.id}
          renderItem={({ item: l }) => (
            <View style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={[
                  styles.logBadge,
                  l.actionType.includes('SUSPEND') || l.actionType.includes('DELETE') || l.actionType.includes('HIDE')
                    ? styles.logBadgeDanger
                    : styles.logBadgeNeutral,
                ]}>
                  <Text style={styles.logBadgeText}>
                    {ACTION_LABELS[l.actionType] ?? l.actionType}
                  </Text>
                </View>
                <Text style={styles.logTime}>{fmtDate(l.createdAt)}</Text>
              </View>
              <Text style={styles.logDesc}>{l.description}</Text>
              {l.admin && (
                <Text style={styles.logAdmin}>관리자: {l.admin.nickname}</Text>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>로그 없음</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={20} color={page === 1 ? colors.border : colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageText}>{page} / {totalPages}</Text>
          <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={20} color={page === totalPages ? colors.border : colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── 메인 AdminScreen ─────────────────────────────────────
const TABS: { id: AdminTab; label: string; icon: any }[] = [
  { id: 'overview', label: '개요', icon: LayoutDashboard },
  { id: 'users',    label: '유저', icon: Users },
  { id: 'spots',    label: '스팟', icon: MapPin },
  { id: 'logs',     label: '로그', icon: ScrollText },
];

const AdminScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'users':    return <UsersTab />;
      case 'spots':    return <SpotsTab />;
      case 'logs':     return <LogsTab />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>관리자 패널</Text>
          <Text style={styles.headerSub}>ADMIN</Text>
        </View>
      </View>

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, activeTab === id && styles.tabActive]}
            onPress={() => setActiveTab(id)}
          >
            <Icon size={16} color={activeTab === id ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      <View style={styles.tabContent}>
        {renderTab()}
      </View>
    </SafeAreaView>
  );
};

export default AdminScreen;

// ─── 스타일 ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 4 },
  headerTitle: { ...typography.body1, fontWeight: '700', color: '#ef4444' },
  headerSub: { ...typography.caption, color: colors.textSecondary },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1, flexDirection: 'column', alignItems: 'center',
    paddingVertical: 10, gap: 3,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary },

  tabContent: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },

  sectionTitle: { ...typography.body1, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  // 개요 그리드
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '47.5%', backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },

  // 검색 바
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 9,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, ...typography.body2, color: colors.text },
  totalText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },

  // 유저 카드
  userCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  userCardSuspended: { borderColor: '#ef444440' },
  userLeft: { flex: 1, marginRight: spacing.sm },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  userNick: { ...typography.body2, fontWeight: '700', color: colors.text },
  badgeAdmin: { backgroundColor: '#ef444425', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeAdminText: { fontSize: 10, color: '#ef4444', fontWeight: '700' },
  badgeUser: { backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeUserText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  badgeSuspend: { backgroundColor: '#ef444425', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeSuspendText: { fontSize: 10, color: '#ef4444', fontWeight: '700' },
  userEmail: { ...typography.caption, color: colors.textSecondary },
  userMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  userActions: { flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-end' },
  userActionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 48, alignItems: 'center' },
  suspendBtn: { backgroundColor: '#ef444420' },
  unsuspendBtn: { backgroundColor: '#22c55e20' },
  userActionText: { fontSize: 12, fontWeight: '700', color: colors.text },
  roleBtn: { backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  roleBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  // 스팟 행
  spotRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  spotInfo: { flex: 1 },
  spotName: { ...typography.body2, fontWeight: '700', color: colors.text },
  spotMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 6 },

  // 로그 카드
  logCard: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  logBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  logBadgeDanger: { backgroundColor: '#ef444420' },
  logBadgeNeutral: { backgroundColor: colors.border },
  logBadgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  logTime: { ...typography.caption, color: colors.textTertiary },
  logDesc: { ...typography.body2, color: colors.text },
  logAdmin: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },

  // 페이지네이션
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg,
    paddingVertical: 12,
  },
  pageText: { ...typography.body2, color: colors.textSecondary },

  emptyText: { ...typography.body2, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
