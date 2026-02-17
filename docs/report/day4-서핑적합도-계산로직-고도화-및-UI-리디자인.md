# Day 4: 서핑 적합도 계산 로직 고도화 및 UI 리디자인

> **작업일**: 2026-02-17 (월)
> **작업 유형**: 계산 로직 고도화 + UI 리디자인 + 오류 보정 + 검증
> **버전 변경**: surf-rating v1.3 → v1.4 → v1.4.1 → v1.4.2
> **테스트**: 79개 전체 통과 (단위 58개 + 검증 21개)

---

## 1. 작업 개요

Day 4의 핵심 목표는 **서핑 적합도(Surf Rating) 계산 엔진의 정확도 향상**과 **Surfline 스타일 UI 리디자인**입니다.

### 작업 흐름

```
v1.3 기본 엔진 → v1.4 하드블록+조석 추가 → v1.4.1 거짓양성 보정 → v1.4.2 거짓음성 보정
```

| 단계 | 내용 | 테스트 |
|------|------|--------|
| v1.3 → v1.4 | 하드블록 안전 필터 + 조석 데이터 연동 | 27개 |
| v1.4 → v1.4.1 | 거짓양성(False Positive) 보정 | +18개 = 45개 |
| v1.4.1 → v1.4.2 | 거짓음성(False Negative) 보정 | +13개 = 58개 |
| 검증 스위트 | v1.4.2 실제 시나리오 검증 | +21개 = 79개 |

---

## 2. 계산 로직 고도화

### 2-1. v1.4: 하드블록 안전 필터 (STEP 1 신설)

점수 계산 이전에 **위험 조건을 먼저 차단**하는 안전 필터 도입.

#### 차단 기준

| 조건 | 초보 | 중급 | 상급 |
|------|------|------|------|
| effectiveWind > 35km/h | BLOCKED | BLOCKED | BLOCKED |
| 파고 > 1.2m (비치) | BLOCKED | - | - |
| 파고 > 2.5m (리프) | - | BLOCKED | - |
| gust ≥ 45km/h | BLOCKED | - | - |
| gust ≥ 35km/h | WARNING | - | - |

#### 조석(Tide) 데이터 연동

- Open-Meteo Marine API에서 `tideHeight` 수집 추가
- 스팟별 `optimalTideMin/Max` 설정 → 조석 적합도 계산에 활용
- 향후 조석 차트 시각화 기반 데이터 확보

### 2-2. v1.4: 5개 항목 fit 가중합

| 항목 | 가중치 | 설명 |
|------|--------|------|
| waveFit | 30% (× waveMultiplier) | 파고 적합도 |
| periodFit | 20% | 파주기 적합도 |
| windSpeedFit | 20% | 풍속 적합도 |
| swellFit | 15% | 스웰 높이 적합도 |
| windDirFit | 15% | 풍향 적합도 |

**waveMultiplier**: waveFit 점수에 따른 전체 점수 조절 (파도 없으면 서핑 불가)
- waveFit=0 → multiplier=0.20 (최종 2점대)
- waveFit=5 → multiplier=0.73
- waveFit=10 → multiplier=1.00

### 2-3. v1.4.1: 거짓양성 보정 (STEP 3.5)

**문제**: 각 항목이 "간신히 통과"인데 최종 점수가 높게 나오는 경우.

#### ① 복합 위험 감점 (Compound Risk Penalty)

```
riskIndex = (gustProx + waveProx + tempProx) / 3

gustProx: effectiveWind가 기준에 얼마나 가까운지 (0~1)
waveProx: 파고가 상한에 얼마나 가까운지 (0~1)
tempProx: 수온이 하한에 얼마나 가까운지 (0~1)

riskIndex ≥ 1.0 → multiplier = 0.70 (30% 감점)
riskIndex ≥ 0.6 → multiplier = 0.85 (15% 감점)
riskIndex < 0.6 → 감점 없음
```

> **돌풍 기준 정리** (3단계):
> - `effectiveWind > 35km/h` → 모든 레벨 BLOCKED (STEP 1 하드블록)
> - `gust ≥ 45km/h` → 초보 BLOCKED (STEP 1 하드블록)
> - `gust ≥ 35km/h` → 초보 WARNING (STEP 1 하드블록)
> - `gustProx` 계산 → 복합 위험 감점에 사용 (STEP 3.5)

#### ② 품질 게이트 (Quality Gate)

```
조건: windDirFit ≤ 2 (정면 온쇼어) AND periodFit ≤ 3 (짧은 파주기)
결과: surfRating = min(surfRating, 4.0)
```

### 2-4. v1.4.2: 거짓음성 보정 (STEP 2.5 + STEP 3.7)

**문제**: 실제로 서핑 가능한데 앱이 "위험" 또는 "매우 낮은 점수"로 판정하는 경우.

#### FN-4: waveFit grace margin (STEP 2 수정)

```
문제: 파고 0.28m → tolMin=0.3 바로 아래 → waveFit=0 → 최종 2점
보정: ±5cm grace margin 추가

하한: tolMin-0.05 ~ tolMin → waveFit 1~2점 (기존 0점)
상한: tolMax ~ tolMax+0.05 → waveFit 2~1점 (기존 0점)
grace 밖 → 기존대로 0점
```

#### FN-2: 약풍 시 풍향 보정 (STEP 2.5 신규)

```
문제: 풍속 3km/h(글래시)인데 온쇼어면 windDirFit=1 → 점수 크게 깎임
보정: 바람 거의 없으면 풍향 무의미

effectiveWind < 5 → windDirFit = max(기존, 7)
effectiveWind 5~8 → windDirFit = max(기존, (기존+7)/2)
effectiveWind ≥ 8 → 보정 없음
```

#### FN-1: 하드블록 grace zone (STEP 3.7 신규)

```
문제: 파고 1.25m + beach_break + 나머지 조건 완벽 → BLOCKED
보정: 엄격한 조건 하에 WARNING으로 완화

조건 (ALL 충족 시):
  1. BEGINNER가 BLOCKED 상태
  2. 파고 1.2~1.4m (grace zone)
  3. breakType = beach_break (reef/point 제외)
  4. 나머지 4개 fit 평균 ≥ 7.0

결과: BLOCKED → WARNING
메시지: "초보에겐 여전히 높은 파고, 경험자 동행 필수"
```

> **안전 설계**: "주의하며 서핑 가능" 같은 완화 톤이 아닌, "경험자 동행 필수"로 경고 유지.
> 초보자가 혼자 서핑해도 된다고 오해하지 않도록 메시지 톤을 의도적으로 강하게 설정.

### 2-5. 최종 파이프라인 (v1.4.2)

```
STEP 1:   checkHardBlock() → levelFit + safetyReasons
STEP 2:   5개 calcFit (waveFit에 grace margin 포함)
STEP 2.5: applyLightWindDirCorrection()          ← v1.4.2 (FN-2)
STEP 3:   가중합 × waveMultiplier → surfRating
STEP 3.5: 거짓양성 보정 (v1.4.1)
  ① calcCompoundRiskPenalty()
  ② applyQualityGate()
STEP 3.7: 거짓음성 보정                           ← v1.4.2
  ③ applyHardBlockGraceZone()                    ← v1.4.2 (FN-1)
STEP 4:   추천 메시지 + 신호등 분류
```

---

## 3. UI 리디자인 (Surfline 스타일)

### 3-1. 변경 내용

| 항목 | Before | After |
|------|--------|-------|
| 점수 표시 | 숫자만 표시 | 신호등 색상 (초록/노랑/빨강) + 번개 아이콘 |
| 카드 레이아웃 | 단순 리스트 | 스팟 카드 + 핵심 정보 한눈에 |
| 베스트 스팟 | 없음 | 상단 캐러셀 (점수 상위 3개) |
| 탭 필터 | 없음 | 전체 / 한국 / 발리 지역 탭 |
| 상세 모달 | 없음 | 스팟 클릭 시 상세 예보 + 안전 정보 |
| 하단 네비게이션 | 없음 | 홈 / 지도(예정) / 프로필 |

### 3-2. 신호등 색상 시스템

```
8~10점: 초록 (#22c55e) - "좋음" / "완벽한 서핑 컨디션"
5~7점:  노랑 (#eab308) - "보통" / "서핑 가능하지만 주의"
1~4점:  빨강 (#ef4444) - "나쁨" / "서핑 비추천"
```

### 3-3. SpotCard 핵심 정보

```
┌─────────────────────────────────┐
│ 🏖️ 양양 죽도         ⭐ 8.2    │
│ 한국 · beach_break              │
│                                 │
│ 파고 0.8m  주기 9s  바람 8km/h  │
│ 🟢 좋음 · 완벽한 서핑 컨디션   │
└─────────────────────────────────┘
```

---

## 4. 테스트 및 검증

### 4-1. 단위 테스트 (58개)

| 섹션 | 테스트 수 | 내용 |
|------|-----------|------|
| 1. 기본 구조 | 3개 | 함수 존재, 반환 형식 |
| 2~6. fit 계산 | 12개 | 각 항목별 점수 계산 |
| 7. 하드블록 | 5개 | 안전 필터 동작 |
| 8. 통합 | 3개 | 전체 파이프라인 |
| 9. 스트레스 | 4개 | 극단값 처리 |
| 10. 거짓양성 | 5개 | v1.4.1 보정 |
| 11. 거짓음성 | 13개 | v1.4.2 보정 |
| 12. 회귀 방지 | 13개 | 기존 동작 유지 확인 |

### 4-2. 검증 스위트 (21개)

실제 한국/발리 스팟 데이터를 사용한 시나리오 기반 검증.

| 카테고리 | 테스트 수 | 내용 |
|----------|-----------|------|
| A: v1.4.1 회귀 검증 | 5개 | 기존 거짓양성 보정이 여전히 동작하는지 |
| B: 거짓음성 해결 검증 | 7개 | FN-1, FN-2, FN-4 각각 보정 확인 |
| C: 과보정 안전 검증 | 8개 | 보정이 위험한 상황을 통과시키지 않는지 |
| D: 실제 스팟 종합 비교 | 1개 | 양양죽도 다양한 조건에서 일관성 검증 |

### 4-3. 검증에 사용된 실제 스팟

| 스팟 | 지역 | breakType | difficulty |
|------|------|-----------|------------|
| 양양 죽도 | 한국 | beach_break | BEGINNER |
| 부산 송정 | 한국 | beach_break | BEGINNER |
| 제주 중문 | 한국 | reef_break | INTERMEDIATE |
| 발리 쿠타 | 발리 | beach_break | BEGINNER |
| 발리 울루와투 | 발리 | reef_break | ADVANCED |

---

## 5. 리뷰 피드백 반영

### 5-1. FN-1 메시지 톤 수정

| 구분 | 변경 전 | 변경 후 |
|------|---------|---------|
| 안전 메시지 | "약간 높지만 다른 조건이 좋아 주의하며 서핑 가능" | "초보에겐 여전히 높은 파고, 경험자 동행 필수" |

**이유**: 변경 전 메시지는 초보자가 "서핑 가능"에만 집중해서 혼자 입수할 위험이 있음. "경험자 동행 필수"로 경고 수위를 유지.

### 5-2. 돌풍 기준 문서 명확화

거짓양성 문서에서 `35`, `45` 수치가 여러 맥락에서 등장해 혼동 가능성이 있어, 3단계 구분 설명 박스를 추가.

---

## 6. 알려진 한계 및 향후 개선

### 6-1. riskIndex 불연속성

```
현재 (2단계 계단 함수):
  riskIndex 0.59 → multiplier 1.00 (감점 없음)
  riskIndex 0.60 → multiplier 0.85 (15% 감점)  ← 1점 차이로 급변
  riskIndex 0.99 → multiplier 0.85
  riskIndex 1.00 → multiplier 0.70 (30% 감점)  ← 또 급변

개선안 (sigmoid 연속 함수):
  multiplier = 1.0 - 0.40 × sigmoid(riskIndex)
  → 모든 구간에서 부드럽게 전환
  → 경계값 근처 점수 급변 방지
```

### 6-2. C-7 케이스: 글래시 + 짧은 파주기

```
현상: 풍속 2km/h (글래시) + 파주기 4s → 최종 7.6점 (높은 편)
원인: 글래시 보정(FN-2)이 windDirFit을 올려서 qualityGate 우회
분석: 파주기 4s는 실제로 잔파 → 7.6점은 과대평가 가능성
개선안: qualityGate에 "글래시인데 파주기 매우 짧은" 예외 분기 추가 검토
```

### 6-3. Grace zone 지역 차이

```
현재: beach_break + 1.2~1.4m → 한국/발리 동일 기준
검토: 발리 비치(쿠타)와 한국 비치(죽도)의 해저 경사/지형이 다름
개선안: 지역별 grace zone 상한 차등 적용 (예: 한국 1.35m / 발리 1.45m)
```

---

## 7. 파일 변경 요약

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `surf-rating.util.ts` | v1.3 → v1.4.2 전체 고도화 |
| `surf-rating.util.spec.ts` | 27개 → 58개 테스트 |
| `SpotCard.tsx` | 신호등 색상 + 핵심 정보 카드 |
| `SpotDetailModal.tsx` | 상세 예보 모달 |
| `Header.tsx` | 앱 헤더 리디자인 |
| `BottomNav.tsx` | 하단 네비게이션 |
| `Home.tsx` | 베스트 캐러셀 + 탭 필터 |
| `App.tsx` | 라우팅 + 레이아웃 |
| `index.css` | Surfline 스타일 CSS |
| `types/index.ts` | 타입 정의 업데이트 |
| `lib/utils.ts` | 유틸리티 함수 추가 |

### 신규 파일

| 파일 | 내용 |
|------|------|
| `surf-rating-v142-verify.spec.ts` | v1.4.2 검증 스위트 (21개) |
| `docs/error-solutions/파도계산시-거짓양성-오류.md` | 거짓양성 해결 문서 |
| `docs/error-solutions/파도계산시-거짓음성-오류.md` | 거짓음성 해결 문서 |

---

## 8. 다음 단계

| 우선순위 | 항목 | 설명 |
|----------|------|------|
| HIGH | riskIndex sigmoid 업그레이드 | 2단계 계단 → 연속 sigmoid로 수학적 안정성 확보 |
| HIGH | C-7 과대평가 보정 | 글래시 + 짧은 파주기 조합 qualityGate 보강 |
| MEDIUM | 지역별 grace zone 차등 | 한국/발리 해저 지형 차이 반영 |
| MEDIUM | Phase 2 지도 통합 | MapLibre GL JS + OpenFreeMap 스팟 마커 |
| LOW | 즐겨찾기 기능 | 사용자별 스팟 즐겨찾기 |
