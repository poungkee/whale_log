# 서핑 적합도(Surf Rating) 계산 로직 설계 v1.3

> **작성일**: 2026-02-14
> **최종 수정**: 2026-02-14 (2차 리뷰 반영 v1.3)
> **상태**: 설계 완료, 구현 전
> **적용 대상**: surf-wave-backend 예보 서비스

---

## 1. 개요

### 1.1 기존 로직 (v0) 문제점

```
시작 5점 → 파고/풍속/주기 조건에 따라 감점 → 1~5점
```

| 문제 | 설명 |
|------|------|
| 스팟 특성 무시 | reef든 beach든 동일 기준으로 계산 |
| 레벨 구분 없음 | 초보/중급/상급 동일 기준 |
| 스웰 방향 미활용 | bestSwellDirection 데이터 있지만 계산에 안 씀 |
| 풍향 계산 불가 | 온쇼어/오프쇼어 판단할 해안 방향 데이터 없음 |
| 안전 장치 없음 | reef_break에 초보자 추천 가능한 위험 |

### 1.2 개선 방향 (v1.1)

- **스팟별 fit 기반**: 스팟 특성(지형, 난이도)에 따라 최적 구간이 다름
- **하드블록 안전 필터**: 점수 계산 전에 위험 조건 먼저 차단
- **5개 항목 가중 합산**: 파고 + 파주기 + 풍속 + 스웰매칭 + 풍향
- **레벨별 적합도 판정**: BEGINNER / INTERMEDIATE / ADVANCED 각각 판별

---

## 2. 필요한 추가 데이터

### 2.1 spots 테이블 신규 컬럼

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `coast_facing_deg` | int (0~359) | 해안이 바라보는 바다 방향 | 서피비치: 90° (동쪽 바다) |
| `best_swell_spread_deg` | int (기본 30~45) | 스웰 허용 범위 (넓을수록 관대) | beach: 45°, reef: 30° |

### 2.2 방향 → 각도 변환 기준

```
N = 0°(360°)   NE = 45°    E = 90°    SE = 135°
S = 180°       SW = 225°   W = 270°   NW = 315°
```

### 2.3 coast_facing_deg 예시

| 스팟 | 해안이 바라보는 방향 | coast_facing_deg |
|------|---------------------|-----------------|
| 양양 서피비치 | 동쪽 바다 | 90° |
| 부산 송정 | 남동쪽 바다 | 135° |
| 제주 중문 | 남쪽 바다 | 180° |
| 태안 만리포 | 서쪽 바다 | 270° |
| Uluwatu | 남남서쪽 바다 | 200° |
| Kuta Beach | 서쪽 바다 | 270° |
| Serangan | 남동쪽 바다 | 135° |

### 2.4 스팟별 파고 구간 override 컬럼 (핵심 수정 #2)

```
스팟마다 "최적 파고 구간"이 다를 수 있음.
기본은 breakType+difficulty 템플릿을 따르지만,
예외 스팟은 DB에서 직접 override 가능하도록 설계.
```

| 컬럼 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `optimal_wave_min` | numeric(3,1), nullable | 이 스팟의 최적 파고 하한 (m) | null (템플릿 사용) |
| `optimal_wave_max` | numeric(3,1), nullable | 이 스팟의 최적 파고 상한 (m) | null (템플릿 사용) |
| `tolerable_wave_min` | numeric(3,1), nullable | 이 스팟의 허용 파고 하한 (m) | null (템플릿 사용) |
| `tolerable_wave_max` | numeric(3,1), nullable | 이 스팟의 허용 파고 상한 (m) | null (템플릿 사용) |

```
사용 로직:
  if (spot.optimalWaveMin != null) {
    // 스팟 고유값 사용
    최적구간 = [spot.optimalWaveMin, spot.optimalWaveMax]
    허용범위 = [spot.tolerableWaveMin, spot.tolerableWaveMax]
  } else {
    // breakType + difficulty 템플릿 사용
    최적구간 = WAVE_TEMPLATE[breakType][difficulty].optimal
    허용범위 = WAVE_TEMPLATE[breakType][difficulty].tolerable
  }

예) Uluwatu는 reef+ADVANCED 템플릿(1.5~2.5m)이 기본이지만
   실제로는 1.2m부터 열리는 스팟 → optimal_wave_min = 1.2 로 override
```

### 2.5 best_swell_spread_deg 기본값

| breakType | 기본 spread | 이유 |
|-----------|-----------|------|
| beach_break | 45° | 모래 바닥이라 다양한 방향 수용 가능 |
| reef_break | 30° | 리프 구조상 특정 방향에서만 파도가 제대로 형성 |
| point_break | 25° | 곶 지형이라 방향 민감 |
| beach_reef_break | 35° | 혼합형, 중간 |

---

## 3. 계산 흐름

```
요청 (유저 레벨 포함)
  │
  ▼
STEP 1: 하드블록 체크 (안전 먼저)
  │ BLOCKED → 점수 계산 스킵, 경고 메시지 반환
  │ PASS/WARNING → 계속
  ▼
STEP 2: 5개 항목 fit 점수 계산 (스팟 특성 반영)
  │
  ▼
STEP 3: 가중 합산 → surfRating (0~10)
  │
  ▼
STEP 4: 레벨별 적합도 + 추천 메시지 + 안전 노트 반환
```

---

## 4. STEP 1: 하드블록 (안전 필터)

**점수 계산보다 먼저 실행. 위험하면 추천 자체를 차단.**

### 4.1 하드블록 룰

| # | 조건 | 결과 | 메시지 |
|---|------|------|--------|
| ① | reef/point_break + BEGINNER | BLOCKED | "리프/포인트 브레이크 - 초보자 서핑 금지" |
| ② | spot.difficulty ≥ ADVANCED + BEGINNER | BLOCKED | "상급자 전용 스팟입니다" |
| ③ | spot.difficulty = EXPERT + INTERMEDIATE | BLOCKED | "전문가 전용 스팟입니다" |
| ④ | wave_height > 1.2m + BEGINNER | BLOCKED | "파도가 높아 초보자에게 위험합니다" |
| ⑤ | wave_height > 2.5m + INTERMEDIATE | WARNING | "파도가 높습니다. 주의하세요" |
| ⑥ | wind_speed > 35km/h | BLOCKED (전체) | "강풍으로 서핑 위험합니다" |

### 4.2 하드블록 우선순위

```
① ~ ⑥ 순서대로 체크
첫 번째 BLOCKED에서 즉시 중단 → 점수 계산 스킵
WARNING은 점수 계산은 진행하되 경고 표시
```

---

## 5. STEP 2: 5개 항목 fit 점수 (각 0~10점)

### 5.1 파고 점수 (waveFit) — 가중치 25%

**스팟의 breakType + difficulty에 따라 최적 구간이 달라짐**

| breakType | difficulty | 최적 구간 | 허용 범위 |
|-----------|-----------|----------|----------|
| beach | BEGINNER | 0.5 ~ 1.0m | 0.3 ~ 1.2m |
| beach | INTERMEDIATE | 0.8 ~ 1.5m | 0.5 ~ 2.0m |
| beach | ADVANCED | 1.0 ~ 2.0m | 0.5 ~ 2.5m |
| reef | INTERMEDIATE | 1.0 ~ 2.0m | 0.8 ~ 2.5m |
| reef | ADVANCED | 1.5 ~ 2.5m | 1.0 ~ 3.5m |
| reef | EXPERT | 2.0 ~ 3.5m | 1.5 ~ 5.0m |
| point | INTERMEDIATE | 1.0 ~ 1.8m | 0.8 ~ 2.5m |
| point | ADVANCED | 1.5 ~ 2.5m | 1.0 ~ 3.5m |

```
계산 공식:
  목표중심 = (최적구간 최소 + 최적구간 최대) / 2
  목표범위 = (허용범위 최대 - 허용범위 최소) / 2
  거리 = |현재파고 - 목표중심|
  waveFit = max(0, 10 × (1 - 거리 / 목표범위))
```

```
예) 양양 서피비치 (beach, BEGINNER)
   최적 0.5~1.0m → 중심 0.75m, 범위 0.45m
   현재 파고 = 0.8m
   거리 = |0.8 - 0.75| = 0.05
   waveFit = 10 × (1 - 0.05/0.45) = 8.9점 ✅

예) Uluwatu (reef, ADVANCED)
   최적 1.5~2.5m → 중심 2.0m, 범위 1.25m
   현재 파고 = 0.6m
   거리 = |0.6 - 2.0| = 1.4
   waveFit = 10 × (1 - 1.4/1.25) = 0점 ❌ (파도 안 열림)
```

### 5.2 파주기 점수 (periodFit) — 가중치 15%

**주기가 길수록 깨끗하고 파워 있는 파도 (ground swell)**
**6초 이하는 wind swell로 거의 서핑 불가 → 0~2점**

```
계산 공식 (구간형):
  wavePeriod < 5초  → 0점 (쓰레기 wind swell)
  wavePeriod < 6초  → 1점
  wavePeriod < 7초  → 3점 (겨우 탈 수 있음)
  wavePeriod < 8초  → 5점 (보통)
  wavePeriod < 10초 → 7점 (괜찮음)
  wavePeriod < 12초 → 8점 (좋음, ground swell)
  wavePeriod < 14초 → 9점 (매우 좋음)
  wavePeriod >= 14초 → 10점 (최상급 ground swell)

v1.1 대비 변경: 선형 → 구간형
이유: 5초에 4.2점은 너무 관대. 실제로 5~6초는 엉망인 wind swell.
8초부터 "탈만함", 10초 이상이 진짜 좋은 파도.
```

### 5.3 풍속 점수 (windSpeedFit) — 가중치 20%

**바람 적을수록 파도면이 깨끗함**
**0~10km/h 구간을 고득점, 15km/h부터 급격히 깎는 곡선형**

#### 핵심 수정 #3: gust(돌풍) 반영

```
wind_speed만 보면 "괜찮다"로 나오는데 실제론 gust 때문에 엉망인 날이 자주 있음.
→ effectiveWind를 계산해서 풍속 점수에 사용.

계산:
  effectiveWind = max(wind_speed, wind_gusts × 0.7)

예) wind_speed = 12km/h, wind_gusts = 25km/h
   effectiveWind = max(12, 25×0.7) = max(12, 17.5) = 17.5km/h
   → gust 없었으면 6점이었을 텐데, gust 반영으로 4점으로 떨어짐

예) wind_speed = 8km/h, wind_gusts = 10km/h
   effectiveWind = max(8, 10×0.7) = max(8, 7) = 8km/h
   → gust 영향 없음 (기본 풍속이 더 높으므로)
```

```
계산 공식 (구간형, effectiveWind 기준):
  effectiveWind < 5km/h   → 10점 (글래시 컨디션)
  effectiveWind < 10km/h  → 8점 (약한 바람, 좋음)
  effectiveWind < 15km/h  → 6점 (보통, 파도면 약간 흐트러짐)
  effectiveWind < 20km/h  → 4점 (지저분해짐)
  effectiveWind < 25km/h  → 2점 (꽤 거칠어짐)
  effectiveWind < 35km/h  → 1점 (나쁨)
  effectiveWind >= 35km/h → 0점 (서핑 위험)
```

### 5.4 스웰 매칭 점수 (swellFit) — 가중치 25%

**현재 스웰 방향이 스팟의 최적 방향과 얼마나 일치하는지**

```
입력:
  현재 스웰 방향 = forecast.swellDirection (0~360°)
  최적 방향 = spot.bestSwellDirection → 각도 변환
  허용 범위 = spot.bestSwellSpreadDeg

계산 공식:
  delta = |현재방향 - 최적방향|
  if (delta > 180) delta = 360 - delta   ← 원형 보정
  swellFit = max(0, 10 × (1 - delta / spread))
```

```
예) Serangan: 최적 SE(135°), spread 30°
   현재 스웰 = 140° → delta = 5°
   swellFit = 10 × (1 - 5/30) = 8.3점 ✅

예) Serangan: 현재 스웰 = 270° (W)
   delta = |270-135| = 135°
   swellFit = 10 × (1 - 135/30) = 0점 ❌ (완전 반대 방향)

예) 양양 서피비치: 최적 E(90°), spread 45°
   현재 스웰 = 120° (ESE)
   delta = 30° → swellFit = 10 × (1 - 30/45) = 3.3점 ⚠️
```

### 5.5 풍향 점수 (windDirFit) — 가중치 15%

**오프쇼어(육지→바다)가 최고, 온쇼어(바다→육지)가 최악**

#### 온쇼어/오프쇼어 정의 (스팟 타입 무관, 전 세계 공통)

```
오프쇼어 (Offshore): 육지 → 바다로 부는 바람
  - 파도 진행 방향의 반대쪽에서 불어와 파도면을 받쳐줌
  - 파도면이 깨끗하고 lip이 잘 서는 상태
  - reef, beach, point 모두 동일 원칙

온쇼어 (Onshore): 바다 → 육지로 부는 바람
  - 파도 진행 방향과 같은 쪽에서 불어와 파도면을 부숨
  - 파도면이 지저분하고 choppy한 상태
  - reef, beach, point 모두 동일 원칙

핵심: 정의는 변하지 않는다.
"어떤 풍향이 오프쇼어인지"가 스팟의 coast_facing_deg에 따라 달라질 뿐이다.

예) 같은 서풍(W)이 불 때:
  양양 서피비치 (coast_facing=90° 동쪽 바다) → 오프쇼어 ✅ (육지→바다)
  발리 Medewi (coast_facing=270° 서쪽 바다) → 온쇼어 ❌ (바다→육지)

주의: 발리 리프에서 "바다쪽 바람이 좋다"고 들리는 건
라인업이 바다 한가운데에 있어 헷갈리기 때문.
파도는 여전히 육지를 향해 깨지고, 판단 기준은 파도 진행 방향이다.
```

#### ⚠️ 핵심 보정: 기상 데이터 풍향은 "from" 방향이다

```
기상 데이터의 windDirection은 "바람이 불어오는 방향(from)"으로 정의됨.
  windDirection = 90° → "동쪽에서 불어오는 바람" (동→서로 이동)

따라서 "바람이 향하는 방향(to)"으로 변환해야 정확한 비교 가능:
  wind_to_deg = (windDirection + 180) % 360

이 변환 없이 비교하면 오프쇼어/온쇼어가 완전히 뒤집힘!
```

```
입력:
  현재 풍향 = forecast.windDirection (0~360°, FROM 방향)
  해안 방향 = spot.coastFacingDeg (0~360°, 바다를 향하는 방향)

STEP A: from → to 변환
  wind_to_deg = (windDirection + 180) % 360

STEP B: 해안 방향과 비교
  오프쇼어 = 바람이 바다 쪽으로 향함 (wind_to_deg ≈ coast_facing)
  온쇼어 = 바람이 육지 쪽으로 향함 (wind_to_deg ≈ coast_facing 반대)

계산 공식:
  delta = |wind_to_deg - coastFacingDeg|
  if (delta > 180) delta = 360 - delta

  구간별 점수:
  delta < 30°   → 10점 (오프쇼어 🏄 파도면 깨끗)
  delta < 60°   →  8점 (사이드오프)
  delta < 90°   →  5점 (크로스쇼어)
  delta < 120°  →  3점 (사이드온)
  delta >= 120° →  1점 (온쇼어 💨 파도면 엉망)
```

```
예) 양양 서피비치: coast_facing = 90° (동쪽 바다)

   풍향 = 270° (서쪽에서 불어옴 = 서풍)
   wind_to = (270+180)%360 = 90° (바람이 동쪽으로 향함 = 바다 쪽)
   delta = |90 - 90| = 0° → 오프쇼어 → 10점 ✅
   (서풍 = 육지에서 바다로 불어감 = 오프쇼어 맞음 ✓)

   풍향 = 90° (동쪽에서 불어옴 = 동풍)
   wind_to = (90+180)%360 = 270° (바람이 서쪽으로 향함 = 육지 쪽)
   delta = |270 - 90| = 180° → 온쇼어 → 1점 ❌
   (동풍 = 바다에서 육지로 불어옴 = 온쇼어 맞음 ✓)
```

---

## 6. STEP 3: 가중 합산

```
totalScore = waveFit     × 0.25   (파고 - 스팟별 최적 구간)
           + periodFit   × 0.15   (파주기 - 길수록 좋음)
           + windSpeedFit × 0.20  (풍속 - 약할수록 좋음)
           + swellFit    × 0.25   (스웰 방향 매칭)
           + windDirFit  × 0.15   (풍향 - 오프쇼어가 좋음)

결과: 0.0 ~ 10.0 (소수점 1자리 반올림)
```

### 가중치 설정 근거

| 항목 | 가중치 | 이유 |
|------|--------|------|
| 파고 | 25% | 서핑 가능 여부를 결정하는 가장 핵심 요소 |
| 스웰 매칭 | 25% | 방향이 안 맞으면 파도 자체가 안 들어옴 |
| 풍속 | 20% | 파도 퀄리티(면 정리)에 큰 영향 |
| 파주기 | 15% | ground swell vs wind swell 판별 |
| 풍향 | 15% | 오프쇼어/온쇼어 파도면 퀄리티 |

---

## 7. STEP 4: 최종 출력

### 7.1 점수 → 추천 메시지

| 점수 | 등급 | 한국어 메시지 |
|------|------|-------------|
| 9~10 | EPIC | 완벽한 서핑 컨디션이에요! |
| 7~8.9 | GOOD | 서핑하기 좋은 날이에요! |
| 5~6.9 | FAIR | 무난한 컨디션이에요 |
| 3~4.9 | POOR | 컨디션이 아쉬워요 |
| 0~2.9 | FLAT/DANGER | 오늘은 쉬는 게 좋겠어요 |

### 7.2 레벨별 적합도

각 레벨(BEGINNER/INTERMEDIATE/ADVANCED)에 대해 독립적으로 판정:

```
levelFit = {
  "BEGINNER": "PASS" | "BLOCKED" | "WARNING",
  "INTERMEDIATE": "PASS" | "BLOCKED" | "WARNING",
  "ADVANCED": "PASS" | "BLOCKED" | "WARNING"
}
```

#### 핵심: surfRating과 levelFit은 독립적이다

```
surfRating = "지금 파도가 얼마나 좋은가" (컨디션 퀄리티)
levelFit   = "이 레벨 서퍼가 타도 되는가" (안전/적합도)

이 둘은 완전히 다른 축이다.

케이스 1: rating 8.5 + BEGINNER BLOCKED
  → "컨디션은 좋지만 초보자에겐 위험한 스팟/사이즈입니다"
  → 이건 버그가 아니라 의도. UX에서 명확히 전달해야 함.

케이스 2: rating 5.5 + BEGINNER PASS
  → "컨디션은 무난하고, 초보자도 서핑 가능합니다"

케이스 3: rating 3.0 + ADVANCED PASS
  → "컨디션이 아쉽지만, 상급자는 서핑 가능합니다"
```

#### recommendationKo 생성 규칙

```
if (levelFit === "BLOCKED") {
  // rating 무관, 안전 메시지 우선
  message = safetyNote  // "리프 브레이크 - 초보자 서핑 금지"
} else if (levelFit === "WARNING") {
  // rating 메시지 + 주의 추가
  message = ratingMessage + " 단, 주의가 필요합니다."
} else {
  // rating 기반 메시지
  message = ratingMessage
}
```

### 7.3 API 응답 구조

```json
{
  "spot": {
    "id": "uuid",
    "name": "양양 서피비치",
    "region": "양양",
    "difficulty": "BEGINNER",
    "breakType": "beach_break",
    "bestSwellDirection": "E",
    "coastFacingDeg": 90,
    "season": "6월~10월"
  },
  "forecast": {
    "waveHeight": "0.80",
    "wavePeriod": "9.0",
    "waveDirection": "95.0",
    "swellHeight": "0.65",
    "swellPeriod": "10.2",
    "swellDirection": "88.0",
    "windSpeed": "5.2",
    "windGusts": "8.1",
    "windDirection": "85.0"
  },
  "surfRating": 8.2,
  "levelFit": {
    "BEGINNER": "PASS",
    "INTERMEDIATE": "PASS",
    "ADVANCED": "PASS"
  },
  "detail": {
    "waveFit": 8.9,
    "periodFit": 7.5,
    "windSpeedFit": 8.7,
    "swellFit": 9.5,
    "windDirFit": 10.0
  },
  "recommendationKo": "서핑하기 좋은 날이에요!",
  "safetyNote": null
}
```

### 7.4 하드블록 걸린 경우 응답

```json
{
  "spot": {
    "name": "Uluwatu",
    "difficulty": "ADVANCED",
    "breakType": "reef_break"
  },
  "surfRating": 7.5,
  "levelFit": {
    "BEGINNER": "BLOCKED",
    "INTERMEDIATE": "WARNING",
    "ADVANCED": "PASS"
  },
  "safetyNote": "리프 브레이크 - 초보자 서핑 금지"
}
```

---

## 8. 데이터 정확도 및 한계

### 8.1 Open-Meteo API 데이터 정확도

| 데이터 | 정확도 | 근거 |
|--------|--------|------|
| wave_height | ★★★★☆ | NOAA GFS 기반, 외해 ±0.3m 오차 |
| wave_period | ★★★★☆ | 비교적 안정적, 큰 오차 드묾 |
| wave_direction | ★★★☆☆ | 외해 기준, 근해/리프 굴절 미반영 |
| swell_height/period | ★★★★☆ | ERA5 기반 스웰 분리, 신뢰도 높음 |
| swell_direction | ★★★☆☆ | 외해 기준, 해안 근처 굴절/회절 미반영 |
| wind_speed | ★★★★☆ | GFS/ECMWF 기반, ±5km/h 오차 |
| wind_direction | ★★★★☆ | 대체로 정확, 국지풍은 미반영 |

### 8.2 하드블록에 미치는 영향

```
Q: 바람/스웰 데이터가 부정확하면 하드블록도 무의미한 거 아냐?

A: 하드블록 6개 룰 중 데이터 정확도에 의존하는 건 2개뿐:
   ④ wave_height > 1.2m + BEGINNER → BLOCKED
   ⑥ wind_speed > 35km/h → BLOCKED (전체)

   나머지 4개는 "고정 데이터"로 판단:
   ① reef/point_break + BEGINNER → 파도 상관없이 무조건 차단
   ② spot.difficulty ≥ ADVANCED + BEGINNER → 고정 속성으로 차단
   ③ spot.difficulty = EXPERT + INTERMEDIATE → 고정 속성으로 차단
   ⑤ wave_height > 2.5m + INTERMEDIATE → WARNING (차단 아님)

   즉, 가장 중요한 안전 룰(①②③)은 API 정확도와 무관.
   API 데이터 기반 룰(④⑥)은 보수적으로 설정 (마진 포함).
```

### 8.3 fit 점수에 미치는 영향

```
swellFit, windDirFit은 방향 데이터 정확도에 의존.
Open-Meteo 방향 데이터는 "외해 기준"이라 해안 근처 굴절 미반영.

대응 방안:
1. spread를 넉넉하게 설정 (beach 45°, reef 30°)
   → 다소 부정확해도 fit 점수가 0점으로 떨어지진 않음
2. 풍향 점수를 계단형으로 설계 (연속형이 아닌 30° 단위 구간)
   → ±15° 오차에도 구간이 안 바뀜
3. 교차 검증 (Phase 4): Stormglass API로 방향 데이터 스팟체크
   → 오차가 큰 스팟은 보정값(offset) 적용 가능
```

### 8.4 향후 정확도 개선 방안

| 단계 | 방법 | 효과 |
|------|------|------|
| Phase 4 | Stormglass 교차 검증 (10건/일) | 방향 오차 감지 |
| Phase 4 | CMEMS 배치 검증 (월 1회) | 전체 데이터 품질 모니터링 |
| 미래 | 유저 피드백 기반 보정 | "실제로 파도 좋았다/안 좋았다" 누적 학습 |
| 미래 | 스팟별 보정값(offset) | 특정 스팟의 체감 오차 보정 |

---

## 9. 구현 순서

| 순서 | 작업 | 비고 |
|------|------|------|
| 1 | spots 테이블에 coast_facing_deg, best_swell_spread_deg 추가 | 컬럼 + 97개 데이터 |
| 2 | 방향 문자열 → 각도 변환 유틸 함수 | N→0, NE→45, E→90... |
| 3 | 하드블록 룰 구현 | STEP 1 |
| 4 | 5개 fit 점수 계산 함수 | STEP 2 |
| 5 | 가중 합산 + 추천 메시지 | STEP 3~4 |
| 6 | 대시보드 API 응답 구조 변경 | 기존 1~5점 → 0~10점 + detail |
| 7 | 프론트엔드 대시보드 반영 | 점수/레벨핏/안전노트 표시 |

---

## 10. swell_height / swell_period 활용 (확장 예정)

현재 v1.2에서는 wave_height, wave_period를 주 지표로 사용.
swell_height/period는 향후 "세트 퀄리티" 점수로 활용 예정:

```
향후 추가 항목:
  swellQuality = swell_height × swell_period 기반
  → "클린한 ground swell" vs "지저분한 wind swell" 판별
  → waveFit에 보너스/페널티 적용
```

---

## 11. 리뷰 반영 이력

### 11.1 v1.1 → v1.2 수정 (1차 리뷰)

| # | 항목 | 문제 | 수정 내용 |
|---|------|------|----------|
| A | **풍향 from/to 뒤집힘** | 기상 데이터 풍향은 "from" 정의인데 직접 비교함 → 오프쇼어/온쇼어 반대 계산 | `wind_to_deg = (windDirection + 180) % 360` 변환 추가 |
| B | **periodFit 너무 관대** | 5초에 4.2점 → 실제로는 엉망 wind swell | 선형 → 구간형. 6초 이하 0~1점, 8초부터 5점 이상 |
| C | **windSpeedFit 너무 완만** | 15km/h에 6.3점 → 실제로는 꽤 지저분 | 선형 → 구간형. 0~10km/h 고득점, 15km/h부터 급감 |
| D | **swellFit spread 밖 0점** | 완전 0은 아닐 수 있음 | v1.2에서는 0점 유지 (명확한 기준 우선), spread를 넉넉히 설정으로 대응 |

### 11.2 v1.2 → v1.3 수정 (2차 리뷰)

| # | 항목 | 문제 | 수정 내용 |
|---|------|------|----------|
| 1 | **wind_from/to 고정** | 코드/주석에 "from 기준" 명시 안 하면 나중에 또 헷갈림 | 문서 + 코드 + 주석에 "Open-Meteo windDirection = FROM" 못박기 |
| 2 | **스팟별 wave 구간 override** | breakType+difficulty 템플릿만으로는 예외 스팟 대응 불가 | spots에 `optimal_wave_min/max`, `tolerable_wave_min/max` nullable 컬럼 추가. 값 있으면 스팟값 우선, 없으면 템플릿 |
| 3 | **gust(돌풍) 반영** | wind_speed만 보면 gust 때문에 실제론 엉망인 날을 못 잡음 | `effectiveWind = max(wind_speed, wind_gusts × 0.7)` 적용. windSpeedFit은 effectiveWind 기준으로 계산 |
| 4 | **rating vs levelFit 관계 명시** | rating 높은데 BLOCKED인 케이스가 버그처럼 보임 | recommendationKo 생성 규칙 추가. BLOCKED시 안전 메시지 우선, WARNING시 주의 추가 |

### 11.3 향후 고도화 항목 (v2 이후)

상용 서핑 예보 서비스들이 추가로 사용하는 요소:

| 항목 | 설명 | 우선순위 |
|------|------|---------|
| 조석 (tide) | 만조/간조에 따라 스팟별 최적 타이밍 다름 | Phase 1-3 |
| 스웰 vs 윈드웨이브 분리 | swell_height/period로 세트 퀄리티 판별 | Phase 3 |
| 스팟별 바람 민감도 (wind_sensitivity) | 지형 차폐 효과 반영 (만 안쪽 vs 노출 해변) | v2 |
| 계절/시간대 가중치 | 새벽 글래시, 오후 해풍 패턴 반영 | v2 |
| 유저 피드백 보정 | "실제로 좋았다/안 좋았다" 누적 학습 | v2+ |

### 11.4 업계 비교

```
구조: 안전필터 → 항목별 점수화 → 가중합 → 메시지
→ 추천 시스템의 흔한 패턴. 이 구조 자체는 업계 표준에 부합.

공식: 각 서비스마다 다르고 비공개.
→ 우리 공식은 v1.3 수준에서 충분히 실용적.
→ 핵심은 공식의 정교함보다 "데이터 정확도 + 안전 필터 + 운영 튜닝"에 있음.

v1.3 설계의 강점:
  - 설명 가능한 구조 (detail 항목별 점수 제공)
  - 튜닝 가능한 구조 (스팟별 override, spread 조절)
  - 안전한 구조 (하드블록 우선 실행)
```
