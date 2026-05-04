// #55 풍향 표시 형식 통일 — 로직 검증
// wind.ts 로직을 JS로 동일 구현해서 다양한 케이스 테스트

function degToCompassKo(deg) {
  const dirs = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
                '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[idx];
}

function getWindType(windDir, coastFacingDeg) {
  if (windDir == null || coastFacingDeg == null) return '';
  const windTo = (windDir + 180) % 360;
  let angle = Math.abs(windTo - coastFacingDeg) % 360;
  if (angle > 180) angle = 360 - angle;
  if (angle < 60) return 'OFFSHORE';
  if (angle > 120) return 'ONSHORE';
  return 'CROSS';
}

function getWindTypeLabel(type) {
  switch (type) {
    case 'OFFSHORE': return '오프쇼어';
    case 'ONSHORE':  return '온쇼어';
    case 'CROSS':    return '사이드쇼어';
    default: return '';
  }
}

function formatWindDirection(windDirDeg, coastFacingDeg = null) {
  if (windDirDeg == null || windDirDeg === '') return '';
  const deg = typeof windDirDeg === 'string' ? parseFloat(windDirDeg) : windDirDeg;
  if (isNaN(deg)) return '';
  const compass = degToCompassKo(deg);
  const type = getWindType(deg, coastFacingDeg);
  const label = getWindTypeLabel(type);
  const degText = `(${deg.toFixed(0)}°)`;
  return label ? `${label} · ${compass} ${degText}` : `${compass} ${degText}`;
}

const cases = [
  // [name, windDir, coastFacingDeg, expectedLabel, expectedCompass]

  // 동해안(coast=90°) 시나리오
  ['동해안 - 서풍(270°)', 270, 90, '오프쇼어', '서'],         // 서에서 동으로 부는 바람 = OFFSHORE
  ['동해안 - 동풍(90°)', 90, 90, '온쇼어', '동'],             // 동에서 서로 부는 바람 = ONSHORE
  ['동해안 - 북풍(0°)', 0, 90, '사이드쇼어', '북'],          // 옆 = CROSS
  ['동해안 - 남풍(180°)', 180, 90, '사이드쇼어', '남'],      // 옆 = CROSS

  // 발리 우루와뚜(서향, coast=270°) 시나리오
  ['우루와뚜 - 동풍(90°)', 90, 270, '오프쇼어', '동'],        // 동→서 = OFFSHORE
  ['우루와뚜 - 서풍(270°)', 270, 270, '온쇼어', '서'],        // 서→동 = ONSHORE

  // 16방위 정확도 검증
  ['남서(225°)', 225, null, '', '남서'],
  ['북북동(22.5°)', 22, null, '', '북북동'],
  ['북서(315°)', 315, null, '', '북서'],

  // 엣지 케이스
  ['null 풍향', null, 90, '', ''],
  ['null 해변방향 → 라벨 없음', 270, null, '', '서'],
  ['둘 다 null', null, null, '', ''],
  ['0° = 북', 0, null, '', '북'],
  ['360° = 북', 360, null, '', '북'],
];

console.log('=== #55 풍향 표시 형식 통일 검증 ===\n');
let pass = 0, fail = 0;
cases.forEach(([name, deg, coast, expLabel, expCompass]) => {
  const compass = deg != null ? degToCompassKo(deg) : '';
  const type = getWindType(deg, coast);
  const label = getWindTypeLabel(type);
  const okCompass = compass === expCompass;
  const okLabel = label === expLabel;
  const ok = okCompass && okLabel;
  if (ok) pass++; else fail++;
  console.log(`[${ok ? '✅' : '❌'}] ${name}`);
  console.log(`     기대: 라벨="${expLabel}", 방위="${expCompass}"`);
  console.log(`     실제: 라벨="${label}", 방위="${compass}"`);
  console.log(`     formatWindDirection: "${formatWindDirection(deg, coast)}"\n`);
});

console.log(`==========================================`);
console.log(`결과: ${pass}/${cases.length} 통과`);
console.log(`==========================================`);
