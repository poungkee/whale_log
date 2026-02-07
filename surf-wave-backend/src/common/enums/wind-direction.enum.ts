/**
 * @file wind-direction.enum.ts
 * @description 바람 방향 열거형 (16방위)
 *
 * 서핑 예보에서 바람 방향을 나타낼 때 사용됩니다.
 * 16방위 체계를 사용하여 정밀한 바람 방향을 표현합니다.
 * 바람 방향은 서핑 시 파도 품질에 큰 영향을 미칩니다 (오프쇼어/온쇼어).
 */
export enum WindDirection {
  N = 'N',
  NNE = 'NNE',
  NE = 'NE',
  ENE = 'ENE',
  E = 'E',
  ESE = 'ESE',
  SE = 'SE',
  SSE = 'SSE',
  S = 'S',
  SSW = 'SSW',
  SW = 'SW',
  WSW = 'WSW',
  W = 'W',
  WNW = 'WNW',
  NW = 'NW',
  NNW = 'NNW',
}
