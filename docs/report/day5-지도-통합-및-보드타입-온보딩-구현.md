# Day 5: 지도 통합 및 보드 타입 온보딩 구현

> **작업일**: 2026-02-17 (월)
> **작업 유형**: 지도 MVP + 보드 타입 기능 + 버그 수정 + 좌표 보정
> **주요 변경**: Phase 2 지도 통합 완료 + Step 0 보드 타입 입력 + 스팟 좌표 50개 보정

---

## 1. 작업 개요

Day 5의 핵심 목표는 **MapLibre GL JS 기반 지도 통합(Phase 2)**과 **보드 타입 온보딩 시스템 구현**입니다.

### 작업 흐름

```
보드 타입 추가 → 온보딩 버그 수정 → 지도 MVP → 지도 UI 고도화 → 좌표 보정 50개
```

| 단계 | 내용 | 결과 |
|------|------|------|
| Step 0 | 보드 타입 입력 + 온보딩 | User 엔티티 확장 + 선택 UI |
| 버그 수정 | 온보딩 무한루프 등 5개 버그 | 전체 수정 + 7개 테스트 통과 |
| Step 1 | 지도 MVP 구현 | MapLibre + 클러스터링 + 마커 |
| Step 1+ | 지도 UI 5가지 개선 | 바텀 시트, 퀵 이동, 범례, 펄스, 자동 줌 |
| 좌표 보정 | 한국 8개 + 발리 42개 | 총 50개 스팟 해안선 정확도 개선 |

---

## 2. Step 0: 보드 타입 입력

### 2-1. 백엔드 변경

#### User 엔티티 확장

```typescript
// user.entity.ts
@Column({ type: 'varchar', length: 20, default: 'UNSET' })
boardType: string; // LONGBOARD | MIDLENGTH | SHORTBOARD | UNSET
```

- `PATCH /users/me`에서 boardType 저장 지원
- `sanitizeUser()`에서 passwordHash 제거 시 boardType 포함하여 반환
- DB 기존 row는 `null` → API 응답에서 `?? 'UNSET'` 폴백 처리

### 2-2. 프론트엔드 변경

#### 온보딩 흐름

```
앱 실행 → surfLevel 없으면 레벨 선택 → boardType 선택 (optional) → 메인 화면
```

- `LevelSelect.tsx`: 레벨 선택 후 보드 타입 선택 단계 추가
- `MyPage.tsx`: 마이페이지에서 보드 타입 변경 가능
- boardType = `UNSET`이어도 메인 화면 접근 허용 (강제 아님)

---

## 3. 버그 수정 (5개)

### BUG 1: 온보딩 무한 루프 (Critical)

```
원인: App.tsx splash 화면에서 boardType === 'UNSET' 체크 →
      매번 level-select로 리다이렉트 → 무한 반복
수정: boardType UNSET 체크 제거, token + surfLevel 있으면 메인으로 이동
```

### BUG 2: Home useEffect boardType 의존성 누락

```
원인: useEffect 의존성 배열에 [surfLevel]만 있고 boardType 없음
수정: [surfLevel, boardType]로 변경 → boardType 변경 시 데이터 re-fetch
```

### BUG 3: 기존 localStorage 호환성

```
원인: 기존 유저의 localStorage JSON에 boardType 필드 자체가 없음 → undefined
수정: App.tsx 초기 로드 시 user.boardType 없으면 'UNSET'으로 자동 보정
```

### BUG 4: DB 기존 row boardType null

```
원인: ALTER TABLE 후 기존 유저 row에 boardType = null
수정: sanitizeUser()에서 ?? 'UNSET' 폴백 (API 레벨 처리)
```

### BUG 5: 스테일 boardType 클로저

```
원인: Home fetchData 함수가 이전 boardType 값을 캡처
수정: BUG 2와 함께 해결 (useEffect 의존성 추가)
```

### 검증 결과

자동화 테스트 스크립트 7개 항목 전체 통과:

| # | 테스트 | 결과 |
|---|--------|------|
| 1 | 회원가입 (기존 유저 409) | PASS |
| 2 | 로그인 | PASS |
| 3 | 내 정보 조회 | PASS |
| 4 | boardType 업데이트 | PASS |
| 5 | 대시보드 (BEGINNER) | PASS |
| 6 | 대시보드 (레벨 없이) | PASS |
| 7 | 대시보드 응답 구조 | PASS |

---

## 4. Step 1: 지도 MVP

### 4-1. 기술 스택

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| maplibre-gl | 5.x | 벡터 지도 렌더링 엔진 |
| react-map-gl | 7.x | React 래퍼 (MapLibre 어댑터) |
| supercluster | 8.x | 마커 클러스터링 알고리즘 |

**타일 서버**: OpenFreeMap (`https://tiles.openfreemap.org/styles/bright`)
- 무료, API 키 불필요
- 밝은(bright) 벡터 스타일 사용

### 4-2. 컴포넌트 구조

```
Explore.tsx (페이지)
├── SpotMap.tsx (지도 메인)
│   ├── <Map> (react-map-gl/maplibre)
│   ├── SpotMarker.tsx (개별 스팟 마커)
│   ├── ClusterMarker.tsx (클러스터 마커)
│   ├── SpotBottomCard.tsx (하단 슬라이드 카드)
│   └── MapControls.tsx (줌/위치 컨트롤)
└── SpotDetailModal.tsx (상세 모달)
```

### 4-3. 커스텀 훅

#### useSpotClusters

```typescript
// 스팟 데이터를 GeoJSON으로 변환 → Supercluster로 클러스터 계산
const { clusters, supercluster } = useSpotClusters({
  spots,      // SpotForecast[]
  bounds,     // [west, south, east, north]
  zoom,       // 현재 줌 레벨
});
```

- 스팟을 GeoJSON Feature로 변환
- Supercluster 인스턴스에 로드
- 현재 뷰포트 바운드 + 줌 레벨로 클러스터 계산
- 줌 레벨에 따라 클러스터 ↔ 개별 마커 자동 전환

#### useGeolocation

```typescript
// 브라우저 Geolocation API 래퍼
const { latitude, longitude, loading, error } = useGeolocation();
```

- 최초 마운트 시 위치 권한 요청
- 성공 시 좌표 반환, 실패 시 에러 메시지

### 4-4. 데이터 흐름

```
Explore.tsx
  ↓ fetch('/api/v1/dashboard/forecasts')  // 레벨 필터 없이 전체 스팟
  ↓ spots: SpotForecast[]
SpotMap.tsx
  ↓ useSpotClusters(spots, bounds, zoom)
  ↓ clusters: SpotFeature[]
  ├── cluster=true → <ClusterMarker> (클릭 시 줌인)
  └── cluster=false → <SpotMarker> (클릭 시 하단 카드)
                         ↓
                    <SpotBottomCard> → "자세히 보기" → <SpotDetailModal>
```

> **참고**: 지도 페이지에서는 레벨 필터를 적용하지 않고 전체 124개 스팟을 표시합니다.
> Home 페이지만 `level={surfLevel}` 필터를 사용합니다.

---

## 5. Step 1+: 지도 UI 5가지 개선

### 5-1. 하단 슬라이드 카드 (SpotBottomCard)

기존 MapLibre Popup 대신 **Google Maps 스타일 바텀 시트** 도입.

```
┌──────────────────────────────────┐
│         ─── (드래그 핸들)     ✕  │
│ 양양 죽도              🟢 8.2   │
│ 한국 · 초급                     │
│                                  │
│ 🌊 0.8m  ⏱ 9s  💨 8km/h  ↑밀물│
│                                  │
│ [오프쇼어] [좋은스웰] [롱보드]  │
│ 완벽한 서핑 컨디션이에요!       │
│                                  │
│ ┌──────────────────────────────┐│
│ │         자세히 보기           ││
│ └──────────────────────────────┘│
└──────────────────────────────────┘
```

**표시 정보:**
- 스팟 이름, 지역, 난이도 (한국어 약칭)
- surfRating 점수 + 등급 배지 (색상)
- 파고, 주기, 풍속, 조석 상태
- hints 태그 배지 (안전주의, 오프쇼어, 좋은스웰 등)
- 추천 문구 (hints.message 또는 recommendationKo)
- "자세히 보기" → SpotDetailModal 연결

**애니메이션:**
- `animate-slide-up`: 하단에서 위로 슬라이드 등장 (0.3s ease-out)
- 배경 오버레이 클릭 시 카드 닫기

### 5-2. 지역 퀵 이동 버튼

지도 상단에 3개 탭 버튼으로 빠른 지역 이동.

| 버튼 | 중심 좌표 | 줌 레벨 |
|------|----------|---------|
| 전체 | 127.5, 20.0 | 4 |
| 국내 | 128.5, 36.5 | 7 |
| 발리 | 115.16, -8.65 | 10 |

- `flyTo` 애니메이션으로 부드러운 이동 (800ms)
- 활성 탭 파란색 하이라이트

### 5-3. 색상 범례

좌측 하단에 surfRating 색상 의미를 표시하는 범례.

| 색상 | 의미 |
|------|------|
| 🔴 #E74C3C | 나쁨 |
| 🟡 #F39C12 | 보통 |
| 🟢 #2ECC71 | 좋음 |
| 🟣 #9B59B6 | 최고 |

- 토글 가능: ✕ 클릭 시 숨김, "범례" 버튼으로 다시 표시

### 5-4. 고점수 마커 펄스 애니메이션

surfRating 7점 이상 스팟에 시각적 강조 효과.

```css
/* 2초 주기 무한 반복 펄스 */
@keyframes pingSlow {
  0%   { transform: scale(1); opacity: 0.6; }
  75%  { transform: scale(2); opacity: 0; }
  100% { transform: scale(2); opacity: 0; }
}
```

- 마커 뒤로 반투명 색상 원이 확장되며 사라지는 효과
- 지도에서 "오늘 좋은 스팟"을 한눈에 식별 가능

### 5-5. 전체 스팟 맞춤 줌 (fitBounds)

최초 로드 시 모든 스팟이 화면에 보이도록 자동 줌 조정.

```typescript
// 모든 스팟 좌표의 min/max 바운드 계산
map.fitBounds(
  [[minLng, minLat], [maxLng, maxLat]],
  { padding: 60, duration: 1000, maxZoom: 12 }
);
```

- `didFitBounds` ref로 최초 1회만 실행
- 한국 + 발리 모든 스팟이 보이는 줌 레벨로 시작

---

## 6. 스팟 좌표 보정 (총 50개)

### 6-1. 문제

기존 스팟 좌표가 마을 중심 또는 내륙에 찍혀있어, 지도에서 바다가 아닌 육지에 마커가 표시되는 문제.

### 6-2. 보정 요약

| 지역 | 수정 수 | 주요 문제 |
|------|---------|----------|
| **한국** | 8개 | 제주/강릉/태안 해변 좌표 내륙 오차 |
| **발리 서부** (Medewi, Balian 등) | 9개 | 마을 중심 좌표 (3~9km 오차) |
| **발리 부킷 반도** (Green Bowl, Pandawa 등) | 6개 | 절벽 안쪽/내륙 좌표 |
| **발리 동부** (Keramas, Cucukan 등) | 15개 | 체계적으로 2~4km 내륙 |
| **누사 렘봉안/체닝안** | 5개 | 바다 한가운데 or 다른 섬 |
| **사누르/누사두아** (Benoa) | 1개 | 맹그로브 지역 |
| **발리 추가 보정** (Jasri 등) | 6개 | 1차에서 누락된 내륙 좌표 |

### 6-3. 한국 스팟 보정 상세

| 스팟 | 수정 전 | 수정 후 |
|------|---------|---------|
| 제주 곽지해변 | 33.4600, 126.3100 | 33.4512, 126.3058 |
| 제주 이호테우해변 | 33.5000, 126.4600 | 33.4979, 126.4530 |
| 강릉 사천해변 | 37.8200, 128.8700 | 37.8300, 128.8784 |
| 강릉 경포해변 | 37.7900, 128.9000 | 37.8055, 128.9078 |
| 태안 만리포해변 | 36.7800, 126.1400 | 36.7862, 126.1423 |
| 제주 표선해변 | 33.3300, 126.8400 | 33.3278, 126.8368 |
| 제주 함덕해변 | 33.5400, 126.6700 | 33.5432, 126.6699 |
| 제주 월정리해변 | 33.5600, 126.8000 | 33.5558, 126.7964 |

### 6-4. 발리 주요 보정 상세 (대표 10개)

| 스팟 | 수정 전 | 수정 후 | 이동 거리 |
|------|---------|---------|----------|
| Truck Stops | -8.565, 115.030 | -8.453, 114.860 | ~30km (완전 다른 위치) |
| Medewi | -8.368, 114.831 | -8.432, 114.817 | ~7km |
| Jasri | -8.470, 115.570 | -8.487, 115.615 | ~5km |
| Balian | -8.475, 114.927 | -8.512, 114.959 | ~4km |
| Padang Galak | -8.664, 115.263 | -8.639, 115.290 | ~3km |
| Keramas Beach | -8.575, 115.353 | -8.606, 115.342 | ~3.5km |
| Melasti | -8.841, 115.165 | -8.848, 115.143 | ~2.5km |
| Green Bowl | -8.838, 115.192 | -8.849, 115.171 | ~2.5km |
| Yeh Gangga | -8.587, 115.054 | -8.592, 115.070 | ~1.7km |
| Berawa | -8.660, 115.142 | -8.667, 115.139 | ~800m |

### 6-5. 보정 방법

1. DB에서 전체 스팟 좌표 추출
2. surf-forecast.com, beachatlas.com, sandee.com, Google Maps 교차 검증
3. 해안선에서 500m 이상 벗어난 스팟 식별
4. PostgreSQL `UPDATE` 쿼리로 일괄 보정
5. API 응답에서 보정된 좌표 확인

---

## 7. 기타 변경사항

### 7-1. 다크 → 밝은 테마 전환

초기 구현은 다크 맵 스타일이었으나, 사용자 피드백으로 밝은 테마로 전환.

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 맵 스타일 | dark (어두운 배경) | bright (밝은 배경) |
| 마커 테두리 | 어두운 색 | 흰색 |
| 마커 그림자 | 없음 | surfRating 색상 glow |
| 라벨 배경 | 반투명 어두운 | 반투명 흰색 |
| 컨트롤 버튼 | 어두운 배경 | 흰색 배경 + 회색 테두리 |
| 클러스터 마커 | 어두운 테두리 | 흰색 테두리 + 파란 glow |

### 7-2. 워터마크 제거

- `attributionControl={false}` (MapLibre 내장 어트리뷰션 비활성화)
- CSS로 `maplibregl-ctrl-logo`, `maplibregl-ctrl-attrib` 등 숨김
- 커스텀 "OpenFreeMap" 텍스트 제거

---

## 8. 파일 변경 요약

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/src/modules/users/user.entity.ts` | boardType 컬럼 추가 |
| `backend/src/modules/users/users.service.ts` | boardType 업데이트 지원 |
| `backend/src/modules/auth/auth.service.ts` | 회원가입 시 boardType 기본값 |
| `backend/src/modules/forecasts/forecasts.service.ts` | hints 생성 로직 |
| `frontend/src/App.tsx` | 온보딩 버그 수정 5건 |
| `frontend/src/pages/Home.tsx` | boardType 의존성 수정 |
| `frontend/src/pages/Explore.tsx` | 레벨 필터 제거 (전체 스팟 표시) |
| `frontend/src/components/SpotMap.tsx` | 전면 재작성 (5가지 개선) |
| `frontend/src/components/SpotMarker.tsx` | 전면 재작성 (펄스, 선택 상태) |
| `frontend/src/components/ClusterMarker.tsx` | 밝은 테마 스타일 |
| `frontend/src/components/MapControls.tsx` | 밝은 테마 스타일 |
| `frontend/src/styles/index.css` | 애니메이션 + 워터마크 숨김 CSS |
| `frontend/src/types/index.ts` | BoardType 타입 추가 |

### 신규 파일

| 파일 | 내용 |
|------|------|
| `frontend/src/components/SpotBottomCard.tsx` | 하단 슬라이드 카드 컴포넌트 |
| `frontend/src/hooks/useSpotClusters.ts` | Supercluster 클러스터 계산 훅 |
| `frontend/src/hooks/useGeolocation.ts` | 브라우저 GPS 위치 훅 |

### DB 변경

| 변경 | 내용 |
|------|------|
| `users` 테이블 | `board_type` 컬럼 추가 (varchar(20), default 'UNSET') |
| `spots` 테이블 | 50개 스팟 좌표 UPDATE (한국 8개 + 발리 42개) |

---

## 9. 빌드 검증

```
TypeScript: npx tsc --noEmit → 에러 없음
Vite 빌드: npx vite build → 성공 (11.07s)
  - index.html:        0.81 kB
  - index.css:       112.48 kB
  - index.js:        656.48 kB
  - maplibre-gl.js: 1,023.62 kB  ← 코드 스플리팅 권장 (백로그)
```

---

## 10. 다음 단계

| 우선순위 | 항목 | 설명 |
|----------|------|------|
| HIGH | 즐겨찾기 기능 | 스팟 즐겨찾기 저장/조회 (DB + API + UI) |
| HIGH | 오늘의 컨디션 투표 | 유저 참여형 현장 컨디션 피드백 |
| HIGH | 기온/수온/날씨 표시 | Open-Meteo Weather API 추가 연동 |
| MEDIUM | 시간대별 예보 차트 | 24h / 7일 예보 그래프 |
| MEDIUM | maplibre-gl 코드 스플리팅 | 1MB 청크 → dynamic import로 분리 |
| LOW | 보드 타입별 점수 분리 | 롱보드/숏보드 별도 계산 로직 |
