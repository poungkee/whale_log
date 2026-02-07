# 서핑 적합도 계산 개선 계획

**작성일**: 2026-02-08
**현재 상태**: 단순 룰 기반 (v0)
**목표**: 물리 공식 기반 정확도 향상

---

## 1. 현재 방식 (v0 — 단순 임계값)

`forecasts.service.ts`의 `calculateSurfRating()` 메서드:

```
기본 점수 5점에서 시작 → 조건별 감점/가점

파고:  < 0.5m → -2  |  > 2.5m → -1
풍속:  > 30m/s → -2  |  > 20m/s → -1
파주기: < 6s → -1    |  > 10s → +1

최종: 1~5점 범위로 클램핑
```

### 문제점
- 파고 1.5m + 주기 6초 vs 파고 1.5m + 주기 12초를 거의 동일하게 평가
  - 실제로는 주기 12초가 에너지 **2배** (서핑 퀄리티 차이 큼)
- 바람의 **방향**을 무시 (온쇼어/오프쇼어 구분 없음)
- 모든 스팟에 동일 기준 적용 (리프/비치/포인트 특성 무시)

---

## 2. 주요 서핑 앱 분석

### Surfline (업계 1위)
- 자체 ML 모델 **LOTUS** 사용
- 파고 + 파주기 + 풍향/풍속 종합 → 1~5점
- 예보관(사람)이 직접 보정
- 정확한 공식 **비공개** (영업 비밀)
- 수년간 축적된 스팟별 데이터 + 인력 필요 → **참고 불가**

### Magic Seaweed (현재 Surfline에 합병)
- 별 5개 시스템
- 채워진 별 = 스웰 파워 (파고 × 파주기 기반)
- 흐린 별 = 바람으로 인한 감점
- 온쇼어(역풍) 시 원래 점수의 **20%씩 감점**
- 합병 후 로직 비공개 → **감점 비율만 참고 가능**

### SwellPower (Old Man's Surf Report) — 추천
- **공개된 물리 공식** 기반
- `P = (ρ × g² × H² × T) / 64π`
  - H = 유의파고 (m), T = 파주기 (s)
  - ρ = 해수 밀도 (1025 kg/m³), g = 중력가속도 (9.81 m/s²)
- 결과를 킬로줄(kJ) 단위로 환산
- 파워가 **파고의 제곱에 비례** → 파고 변화에 민감하게 반응
- 해변별 해저 지형 보정 포함

### Windy.app
- 파고 + 풍속 + **풍향** 조합
- 스팟별 **최적 풍향**을 설정하고, 그 방향에 가까울수록 높은 점수
- 풍향 데이터를 이미 수집하고 있어 향후 적용 가능

---

## 3. 개선 로드맵

### Phase 1: SwellPower 에너지 공식 적용 (난이도: 낮음)

**변경 파일**: `forecasts.service.ts`

현재 임계값 비교를 에너지 기반 계산으로 교체:

```typescript
// 간소화 공식: 상수를 미리 정리
// P = H² × T × 0.51  (단위: kW/m)
private calculateWaveEnergy(waveHeight: number, wavePeriod: number): number {
  return Math.pow(waveHeight, 2) * wavePeriod * 0.51;
}
```

에너지 값 → rating 매핑 (참고 기준):

| 에너지 (kW/m) | 의미 | rating |
|---------------|------|--------|
| < 1.0 | 서핑 불가 (파도 없음) | 1 |
| 1.0 ~ 5.0 | 초급 적합 (부드러운 파도) | 3 |
| 5.0 ~ 15.0 | 중급 적합 (적당한 파워) | 4~5 |
| 15.0 ~ 30.0 | 상급 (강한 파도) | 3~4 (레벨에 따라) |
| > 30.0 | 전문가 전용 (위험) | 1~2 (대부분에게) |

**장점**: 파고와 파주기를 하나의 의미 있는 숫자로 통합. 주기가 긴 클린 스웰을 정확히 평가.

### Phase 2: 바람 감점 체계 (난이도: 중간)

Magic Seaweed 방식 참고:

```
풍향 판정:
- 오프쇼어 (육지→바다): 감점 없음 (이상적)
- 크로스쇼어 (옆바람): -10% 감점
- 온쇼어 (바다→육지): 풍속에 비례하여 -20~40% 감점
```

**필요 데이터**: 현재 수집 중인 `windDirection` + 스팟의 해안선 방향 (신규 추가 필요)

**변경 사항**:
- Spot 엔티티에 `coastDirection` (해안선 방향, 0~360°) 필드 추가
- 풍향과 해안선 방향의 각도 차이로 온쇼어/오프쇼어 판별

### Phase 3: 스팟별 특성 반영 (난이도: 높음)

Windy.app + SwellPower 해저 지형 보정 참고:

**Spot 엔티티 추가 필드**:
- `optimalWindDirection`: 최적 풍향 (0~360°)
- `breakType`: 'BEACH' | 'REEF' | 'POINT' (브레이크 타입)
- `optimalSwellDirection`: 최적 스웰 방향

**보정 로직**:
- 비치 브레이크: 에너지 기준 그대로
- 리프 브레이크: 에너지 × 1.2 (파도가 더 깔끔하게 깨짐)
- 포인트 브레이크: 스웰 방향이 맞으면 에너지 × 1.3

---

## 4. 참고 자료

| 출처 | URL | 핵심 내용 |
|------|-----|----------|
| Surfline - Wave Energy | https://support.surfline.com/hc/en-us/articles/20352744481947-Wave-Energy | 파도 에너지 = H² × T 원리 |
| SwellPower 공식 | https://www.oldmanwaves.com/blog-old/2019/8/2/calculating-the-swellpower-rating-bwNRA | P = ρg²H²T / 64π |
| Surfline - Spot Forecast | https://support.surfline.com/hc/en-us/articles/13749782983579 | LOTUS 모델 + 예보관 보정 |
| Magic Seaweed 별점 | https://ibaworldtour.com/how-to-read-surf-report-magicseaweed/ | 바람 감점 20% 방식 |
| Windy.app 서핑 예보 | https://windy.app/blog/how-to-read-a-surf-forecast.html | 풍향별 최적 조건 판정 |
| 파도 에너지 물리학 | https://en.wikipedia.org/wiki/Wave_power | P ∝ H²T 유도 과정 |
