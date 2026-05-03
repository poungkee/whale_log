// 서핑 가이드 화면 — 5개 카테고리 아코디언 (웹앱 Guide.tsx 1:1 동일 콘텐츠)
//
// 뱃지 트래킹: 가이드는 콘텐츠가 모바일에 하드코딩이라 백엔드 guide_progress를 안 씀.
// 사용자가 항목을 펼치면 SecureStore에 ID 저장 + POST /badges/track-guide-read 호출 →
// 백엔드가 GUIDE_5/GUIDE_ALL 부여 → 인터셉터가 newBadges 자동 토스트.
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Shield, BookOpen, Users, Footprints, Wrench } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { api } from '../../config/api';
import { storage } from '../../config/storage';
import { useAuthStore } from '../../stores/authStore';

// 가이드 항목 타입
interface GuideItem {
  title: string;
  icon: string;
  content: string;
}

// 가이드 카테고리 정의 (웹앱과 동일)
const CATEGORIES = [
  { id: 'rules',  icon: Users,      label: '바다 규칙',  desc: '서핑 에티켓과 우선권', color: '#3B82F6' },
  { id: 'safety', icon: Shield,     label: '안전 상식',  desc: '위험 상황 대처법',     color: '#EF4444' },
  { id: 'terms',  icon: BookOpen,   label: '용어 사전',  desc: '파도·바람·보드 용어',  color: '#22C55E' },
  { id: 'basics', icon: Footprints, label: '기본 자세',  desc: '스탠스·팝업·패들링',  color: '#F59E0B' },
  { id: 'gear',   icon: Wrench,     label: '장비 가이드', desc: '보드·웻슈트·왁스 선택', color: '#8B5CF6' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];


// ===== DB 카테고리 매핑 (백엔드 enum → frontend CategoryId) =====
const DB_TO_CATEGORY: Record<string, CategoryId> = {
  ETIQUETTE: 'rules',
  SAFETY:    'safety',
  BEGINNER:  'terms',
  TECHNIQUE: 'basics',
  EQUIPMENT: 'gear',
  WEATHER:   'basics',
};

// ===== DB 응답 타입 =====
interface DbGuide {
  id: string;
  title: string;
  content: string;
  category: string;
  sortOrder: number;
  estimatedReadMinutes: number;
  isPublished: boolean;
}

// 카테고리별 기본 이모지 (DB에 icon 컬럼 없음 → 카테고리 대체)
const CATEGORY_EMOJI: Record<CategoryId, string> = {
  rules: '🌊', safety: '⚠️', terms: '📖', basics: '🏄', gear: '🛹',
};

// ===== 아코디언 항목 =====

const AccordionItem: React.FC<{
  item: GuideItem;
  categoryColor: string;
  guideId: string;
  alreadyRead: boolean;
  onFirstOpen: (guideId: string) => void;
}> = ({ item, categoryColor, guideId, alreadyRead, onFirstOpen }) => {
  const [open, setOpen] = useState(false);
  const reportedRef = useRef(alreadyRead);
  return (
    <View style={accordionStyles.container}>
      <TouchableOpacity
        style={accordionStyles.header}
        onPress={() => {
          const next = !open;
          setOpen(next);
          if (next && !reportedRef.current) {
            reportedRef.current = true;
            onFirstOpen(guideId);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={accordionStyles.icon}>{item.icon}</Text>
        <Text style={accordionStyles.title}>{item.title}</Text>
        {open
          ? <ChevronUp size={16} color={colors.textTertiary} />
          : <ChevronDown size={16} color={colors.textTertiary} />
        }
      </TouchableOpacity>
      {open && (
        <View style={accordionStyles.body}>
          {/** 본문 시작 부분에 짧은 컬러 액센트만 — 끝까지 이어지는 borderLeft는 "잘린 느낌"이라 제거 */}
          <View style={[accordionStyles.colorAccent, { backgroundColor: categoryColor }]} />
          {renderContent(item.content)}
        </View>
      )}
    </View>
  );
};

/**
 * 본문 렌더러 — bullet/번호 항목은 hanging indent로 분리.
 * "• 항목" 또는 "1. 항목" 형태일 때 마커와 본문을 분리해서
 * wrap된 두번째 줄이 마커가 아닌 본문 시작점에 정렬되게 함.
 * (이전: 한 Text로 렌더 → 두번째 줄이 화면 왼쪽 끝부터 시작해서 가독성 떨어짐)
 */
function renderContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    /** 빈 줄 — 단락 구분 spacer */
    if (line.trim() === '') {
      return <View key={i} style={{ height: 8 }} />;
    }

    /** 들여쓰기 감지 (앞 공백 2칸 단위) — 중첩 bullet 표현 */
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[0].length : 0;
    const trimmed = line.trimStart();

    /** bullet (• - *) 또는 숫자(1. 2. ...) 마커 감지 */
    const bulletMatch = trimmed.match(/^([•\-*])\s+/);
    const numberMatch = trimmed.match(/^(\d+\.)\s+/);
    const marker = bulletMatch?.[1] ?? numberMatch?.[1];

    if (marker) {
      const rest = trimmed.substring(marker.length).trimStart();
      return (
        <View key={i} style={[accordionStyles.bulletRow, indent > 0 && { paddingLeft: indent * 4 }]}>
          <Text style={accordionStyles.bulletMarker}>{marker}</Text>
          <Text style={accordionStyles.bulletText}>{rest}</Text>
        </View>
      );
    }

    /** 일반 텍스트 줄 (제목/설명/이모지 등) */
    return (
      <Text key={i} style={[accordionStyles.contentLine, indent > 0 && { paddingLeft: indent * 4 }]}>
        {trimmed}
      </Text>
    );
  });
}

const accordionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md,
  },
  icon: { fontSize: 18 },
  title: { flex: 1, ...typography.body2, fontWeight: '600', color: colors.text },
  /**
   * 본문 — 화면 너비 최대한 활용 (이전엔 marginLeft+borderLeft+paddingLeft로 좌측 35px 낭비됨)
   * 컬러 줄은 짧은 액센트만 위쪽에 두고, 본문은 padding 균일하게.
   */
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 4,
    /** 헤더와 본문 분리선 */
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  /** 본문 시작에 카테고리 컬러 짧은 액센트 (40px 가로 막대) */
  colorAccent: {
    width: 40, height: 3, borderRadius: 2,
    marginTop: spacing.sm, marginBottom: spacing.sm,
  },
  /**
   * Hanging indent를 위한 bullet 행 — 마커 너비 고정 + 본문 flex:1
   * 본문이 wrap될 때 두번째 줄이 마커가 아닌 본문 시작점에 정렬됨.
   */
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bulletMarker: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
    width: 16,
  },
  bulletText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  /** 일반 텍스트 줄 (bullet/번호 아닌 줄) */
  contentLine: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 3,
  },
});

// ===== 메인 화면 =====

const GuideListScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('rules');
  const category = CATEGORIES.find(c => c.id === selectedCategory)!;

  /** DB에서 조회한 가이드 (Round 3 동적 변환) */
  const [guideData, setGuideData] = useState<Record<CategoryId, GuideItem[]>>({
    rules: [], safety: [], terms: [], basics: [], gear: [],
  });
  const [totalCount, setTotalCount] = useState(0);

  const items = guideData[selectedCategory];

  const [readGuides, setReadGuides] = useState<Set<string>>(new Set());
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  /** 가이드 DB 조회 + 카테고리 그룹핑 */
  useEffect(() => {
    api.get('/guides?limit=200').then(r => {
      const data: DbGuide[] = r.data ?? [];
      const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder);
      const grouped: Record<CategoryId, GuideItem[]> = {
        rules: [], safety: [], terms: [], basics: [], gear: [],
      };
      for (const g of sorted) {
        const cat = DB_TO_CATEGORY[g.category];
        if (!cat) continue;
        grouped[cat].push({
          title: g.title,
          icon: CATEGORY_EMOJI[cat],
          content: g.content,
        });
      }
      setGuideData(grouped);
      setTotalCount(data.length);
    }).catch(() => { /* 빈 상태 표시 */ });
  }, []);

  useEffect(() => {
    storage.getReadGuides().then(ids => setReadGuides(new Set(ids))).catch(() => {});
  }, []);

  const handleFirstOpen = async (guideId: string) => {
    if (!isAuthenticated) return;
    setReadGuides(prev => {
      if (prev.has(guideId)) return prev;
      const next = new Set(prev);
      next.add(guideId);
      const ids = Array.from(next);
      storage.setReadGuides(ids).catch(() => {});
      api.post('/badges/track-guide-read', {
        guideReadCount: ids.length,
        totalGuideCount: totalCount,
      }).catch(() => {});
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 + 카테고리 + 본문 — 한 ScrollView 안에 위에서부터 정렬 (이전엔 컨텐츠가 화면 중앙처럼 보이는 공백 문제 있었음) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 — 컴팩트하게 */}
        <View style={styles.header}>
          <Text style={styles.title}>서핑 가이드</Text>
          <Text style={styles.subtitle}>초보 서퍼를 위한 필수 지식</Text>
        </View>

        {/* 카테고리 탭 (가로 스크롤) */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}
        >
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = cat.id === selectedCategory;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryTab, isActive && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Icon size={16} color={isActive ? cat.color : colors.textTertiary} />
                <Text style={[styles.categoryLabel, isActive && { color: cat.color, fontWeight: '700' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 카테고리 설명 배너 */}
        <View style={[styles.categoryBanner, { backgroundColor: category.color + '10' }]}>
          <Text style={[styles.categoryBannerText, { color: category.color }]}>{category.desc}</Text>
          <Text style={styles.itemCount}>{items.length}개 항목</Text>
        </View>

        {/* 아코디언 목록 */}
        <View style={styles.list}>
          {items.map((item, idx) => {
            const guideId = `${selectedCategory}-${idx}`;
            return (
              <AccordionItem
                key={guideId}
                item={item}
                categoryColor={category.color}
                guideId={guideId}
                alreadyRead={readGuides.has(guideId)}
                onFirstOpen={handleFirstOpen}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  /** 화면 위에서부터 시작하도록 — 이전엔 헤더/카테고리/본문 사이 공백이 너무 커 중앙처럼 보임 */
  scrollContent: { paddingBottom: spacing.xl },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  title: { ...typography.h2, color: colors.text, fontWeight: '700' },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  /** 카테고리 가로 탭 — height 명시 + 자식에 minWidth */
  tabsScroll: { height: 52 },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    flexShrink: 0, minWidth: 80,
  },
  categoryLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },

  categoryBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: 4, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10,
  },
  categoryBannerText: { ...typography.caption, fontWeight: '600' },
  itemCount: { ...typography.caption, color: colors.textTertiary },

  list: { paddingHorizontal: spacing.lg },
});

export default GuideListScreen;
