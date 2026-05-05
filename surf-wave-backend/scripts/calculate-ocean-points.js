// Phase 2: spot별 ocean point 자동 계산
//
// 흐름:
// 1. data/coastlines-*.geojson 메모리 로드
// 2. DB spots 조회 (124개)
// 3. 각 spot:
//    - region에 따라 해안선 선택 (한국 vs 발리)
//    - bbox 5km 사전 필터링 (속도 최적화)
//    - turf.nearestPointOnLine → 가장 가까운 해안선 점 + 거리
//    - 외법선 bearing 계산 (spot→nearest의 반대)
//    - 200m 외측 점 = ocean point
//    - sanity check (50m~5km, 이상치 detection)
// 4. DRY-RUN (기본) / --apply 시 DB UPDATE
//
// 방어 로직:
// - 거리 50m 미만 / 5km 초과 → failed
// - 외법선 NaN → failed
// - ocean point가 다시 육지에 떨어진 경우 (좁은 만) → 외측 거리 늘려 재시도
// - 수동 coast_facing_deg와 60도 이상 차이 → 'review' 표시 (계산은 적용)

const turf = require('@turf/turf');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';
const DRY_RUN = !process.argv.includes('--apply');

const OFFSET_KM = 0.2;       // ocean point는 nearest에서 200m 외측
const RETRY_OFFSET_KM = 0.5; // 좁은 만 재시도 시 500m
const MIN_DIST_M = 5;        // spot ↔ 해안선 최소 거리 (해안선 위 spot 허용)
const MAX_DIST_M = 5000;     // spot ↔ 해안선 최대 거리
const REVIEW_DEG_DIFF = 60;  // 수동값과 차이 60도 이상 = 검토 표시

const dataDir = path.join(__dirname, '..', 'data');

function loadGeoJSON(filename) {
  const fp = path.join(dataDir, filename);
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function mergeFC(...fcs) {
  return {
    type: 'FeatureCollection',
    features: fcs.flatMap(fc => fc.features),
  };
}

console.log('📂 해안선 GeoJSON 로드 중...');
const coastKorea = mergeFC(
  loadGeoJSON('coastlines-korea-east.geojson'),
  loadGeoJSON('coastlines-korea-south.geojson'),
  loadGeoJSON('coastlines-korea-west.geojson'),
);
const coastBali = loadGeoJSON('coastlines-bali.geojson');
console.log(`   한국: ${coastKorea.features.length}개 way`);
console.log(`   발리: ${coastBali.features.length}개 way`);

/**
 * spot 5km 반경 bbox 안의 해안선만 미리 추출 (속도 최적화)
 */
function filterNearby(coastlines, lat, lng, radiusKm = 5) {
  const minLat = lat - radiusKm / 111;
  const maxLat = lat + radiusKm / 111;
  const lonRange = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const minLng = lng - lonRange;
  const maxLng = lng + lonRange;

  return {
    type: 'FeatureCollection',
    features: coastlines.features.filter(f => {
      const coords = f.geometry.coordinates;
      // 빠른 bbox overlap check (line의 어느 한 점이라도 bbox 안에 들어오면 OK)
      return coords.some(([x, y]) => x >= minLng && x <= maxLng && y >= minLat && y <= maxLat);
    }),
  };
}

/**
 * spot에서 가장 가까운 해안선 점 찾기
 */
function findNearestOnCoastline(spot, coastlines) {
  let best = null;
  let minDist = Infinity;
  for (const line of coastlines.features) {
    if (line.geometry.coordinates.length < 2) continue;
    try {
      const candidate = turf.nearestPointOnLine(line, spot, { units: 'meters' });
      if (candidate.properties.dist < minDist) {
        minDist = candidate.properties.dist;
        best = candidate;
      }
    } catch (e) {
      // skip malformed line
    }
  }
  return best;
}

/**
 * ocean point가 진짜 바다 위인지 검증:
 * - ocean point의 nearest 거리가 OFFSET 이상이어야 OK
 * - 짧으면 좁은 만에서 반대 해안선이 더 가까운 것 → fallback
 */
function validateOceanPoint(oceanFeat, coastlines) {
  const validation = findNearestOnCoastline(oceanFeat, coastlines);
  if (!validation) return { ok: true, dist: Infinity };
  return {
    ok: validation.properties.dist >= OFFSET_KM * 1000 * 0.5, // 50% 이상이면 OK
    dist: validation.properties.dist,
  };
}

/** 두 bearing 사이 최소 차이 (0~180°) */
function bearingDiff(a, b) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/**
 * ocean point 계산 (B 알고리즘 — 라인업 좌표 + 수동 외법선 우선)
 *
 * 분기 (manualCoastDeg 있는 케이스):
 * 1. 거리 ≥ 100m → spot이 이미 바다 위 (발리 라인업) → ocean = spot 그대로
 * 2. 5m ≤ 거리 < 100m → manualCoastDeg를 외법선으로 채택 → nearest에서 manualCoastDeg 방향 200m
 * 3. 거리 < 5m → 거의 해안선 위 → manualCoastDeg + 200m
 *
 * 분기 (manualCoastDeg null):
 * 4. 자동 외법선 계산 (spot→nearest의 반대) — 부정확 가능, 자동 status='auto_only'
 */
const LINEUP_DIST_M = 100;   // 이 이상이면 spot 자체가 라인업 좌표 (이미 바다)

function calculateOceanPoint(spot, coastlines, manualCoastDeg) {
  const spotPt = turf.point([spot.lng, spot.lat]);

  // 1. bbox 사전 필터
  const nearby = filterNearby(coastlines, spot.lat, spot.lng);
  if (nearby.features.length === 0) {
    return { status: 'failed', reason: 'no_coastline_in_5km' };
  }

  // 2. 가장 가까운 해안선 점
  const nearest = findNearestOnCoastline(spotPt, nearby);
  if (!nearest) return { status: 'failed', reason: 'no_nearest' };

  const distM = nearest.properties.dist;
  if (distM > MAX_DIST_M) return { status: 'failed', reason: `too_far_${distM.toFixed(0)}m` };

  // 3. 라인업 좌표 케이스 (≥ 100m 떨어진 spot, 발리 등)
  //    → spot 자체가 이미 바다 위 → ocean = spot 그대로
  //    → 외법선 = manualCoastDeg (있으면) 또는 자동
  if (distM >= LINEUP_DIST_M && manualCoastDeg != null) {
    return {
      status: 'ok',
      oceanLat: spot.lat,
      oceanLng: spot.lng,
      coastFacingDegAuto: Math.round(manualCoastDeg * 100) / 100,
      distToCoast: Math.round(distM),
      mode: 'lineup',
    };
  }

  // 4. 해안선 가까운 spot + 수동값 있음 → 수동값을 외법선으로 채택 (자동 외법선 사용 X)
  if (manualCoastDeg != null) {
    let ocean = turf.destination(nearest, OFFSET_KM, manualCoastDeg, { units: 'kilometers' });

    // 검증: ocean이 다시 육지면 더 멀리 (좁은 만)
    let validation = validateOceanPoint(ocean, nearby);
    let usedRetry = false;
    if (!validation.ok) {
      ocean = turf.destination(nearest, RETRY_OFFSET_KM, manualCoastDeg, { units: 'kilometers' });
      validation = validateOceanPoint(ocean, nearby);
      usedRetry = true;
      if (!validation.ok) {
        return { status: 'failed', reason: `ocean_in_land_after_retry_dist=${validation.dist.toFixed(0)}m` };
      }
    }

    return {
      status: 'ok',
      oceanLat: ocean.geometry.coordinates[1],
      oceanLng: ocean.geometry.coordinates[0],
      coastFacingDegAuto: Math.round(manualCoastDeg * 100) / 100,
      distToCoast: Math.round(distM),
      mode: distM < MIN_DIST_M ? 'on_coastline' : 'manual_bearing',
      usedRetry,
    };
  }

  // 5. 수동값 없음 → 자동 외법선 (정확도 낮음, status='auto_only')
  const toCoastBearing = turf.bearing(spotPt, nearest);
  if (!isFinite(toCoastBearing)) return { status: 'failed', reason: 'bearing_nan' };

  // 자동 후보 2개 — spot이 육지/바다 어느 쪽인지 모름
  // 휴리스틱: 거리 < 50m면 spot이 육지에 있을 가능성 높음 → toCoastBearing이 바다 방향
  const oceanBearing = (toCoastBearing + 360) % 360;
  let ocean = turf.destination(nearest, OFFSET_KM, oceanBearing, { units: 'kilometers' });

  let validation = validateOceanPoint(ocean, nearby);
  let usedRetry = false;
  if (!validation.ok) {
    // 반대 방향 시도 (spot이 바다에 있는 경우)
    const reversed = (oceanBearing + 180) % 360;
    ocean = turf.destination(nearest, OFFSET_KM, reversed, { units: 'kilometers' });
    validation = validateOceanPoint(ocean, nearby);
    if (!validation.ok) {
      return { status: 'failed', reason: 'auto_bearing_both_sides_in_land' };
    }
    return {
      status: 'auto_only',
      oceanLat: ocean.geometry.coordinates[1],
      oceanLng: ocean.geometry.coordinates[0],
      coastFacingDegAuto: Math.round(reversed * 100) / 100,
      distToCoast: Math.round(distM),
      mode: 'auto_reversed',
    };
  }

  return {
    status: 'auto_only',
    oceanLat: ocean.geometry.coordinates[1],
    oceanLng: ocean.geometry.coordinates[0],
    coastFacingDegAuto: Math.round(oceanBearing * 100) / 100,
    distToCoast: Math.round(distM),
    mode: 'auto',
  };
}

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  const { rows } = await c.query(`
    SELECT id, name, region,
           latitude::float as lat,
           longitude::float as lng,
           coast_facing_deg
    FROM spots
    WHERE is_active = true
    ORDER BY region, name
  `);

  console.log(`\n📊 ${rows.length}개 spot 처리 시작 (모드: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'})\n`);

  const stats = { ok: 0, auto_only: 0, failed: 0 };
  const modeStats = {};
  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const spot = rows[i];
    const isBali = (spot.region || '').toLowerCase().includes('bali') ||
                   (spot.region || '').includes('발리');
    const coastlines = isBali ? coastBali : coastKorea;

    const result = calculateOceanPoint(
      { lat: spot.lat, lng: spot.lng },
      coastlines,
      spot.coast_facing_deg,
    );

    stats[result.status] = (stats[result.status] || 0) + 1;
    if (result.mode) modeStats[result.mode] = (modeStats[result.mode] || 0) + 1;
    results.push({ ...spot, result });

    process.stdout.write(`\r[${i + 1}/${rows.length}] ${spot.name}${' '.repeat(40)}`);
  }
  console.log('\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ✅ ok:        ${stats.ok || 0}개 (수동 coastFacingDeg 활용)`);
  console.log(`   🤖 auto_only: ${stats.auto_only || 0}개 (수동값 없음, 자동 추정)`);
  console.log(`   ❌ failed:    ${stats.failed || 0}개`);
  console.log(`   ━━━ mode 분포 ━━━`);
  Object.entries(modeStats).forEach(([m, n]) => console.log(`     ${m}: ${n}`));

  // failed 상세 출력
  const failed = results.filter(r => r.result.status === 'failed');
  if (failed.length > 0) {
    console.log('\n━━━ ❌ 실패 케이스 ━━━');
    failed.forEach(f => {
      console.log(`   ${f.name} (${f.region}) — ${f.result.reason}`);
    });
  }

  // auto_only 상세 (수동값 없는 spot — 새로 추가된 것)
  const autoOnly = results.filter(r => r.result.status === 'auto_only');
  if (autoOnly.length > 0) {
    console.log('\n━━━ 🤖 자동 추정 (수동 coastFacingDeg null) ━━━');
    autoOnly.forEach(r => {
      console.log(`   ${r.name} (${r.region}) — auto=${r.result.coastFacingDegAuto}°, 거리 ${r.result.distToCoast}m, mode=${r.result.mode}`);
    });
  }

  // 사용자가 보고한 10개 스팟 자세히
  const TARGET = ['제주 표선해변', '강릉 사천해변', '양양 38도선해변', '제주 중문해변',
                  '부산 송정해변', '양양 서피비치', '동해 망상해변', '태안 만리포해변',
                  '고흥 남열해변', '부산 다대포해변'];
  const targetResults = results.filter(r => TARGET.includes(r.name));
  if (targetResults.length > 0) {
    console.log('\n━━━ 🎯 사용자 보고 10개 spot ━━━');
    targetResults.forEach(r => {
      const { result } = r;
      if (result.status === 'failed') {
        console.log(`   ❌ ${r.name}: ${result.reason}`);
      } else {
        console.log(`   ${result.status === 'ok' ? '✅' : '⚠️'} ${r.name}`);
        console.log(`     spot: (${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}) coastDeg수동=${r.coast_facing_deg}°`);
        console.log(`     ocean: (${result.oceanLat.toFixed(5)}, ${result.oceanLng.toFixed(5)}) coastDeg자동=${result.coastFacingDegAuto}°`);
        console.log(`     해안선까지 ${result.distToCoast}m${result.usedRetry ? ' [retry]' : ''}`);
      }
    });
  }

  // JSON 결과 저장
  const outFile = path.join(dataDir, 'ocean-points-result.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 전체 결과 저장: ${outFile}`);

  // DB UPDATE
  if (!DRY_RUN) {
    console.log('\n💾 DB 업데이트 적용 중...');
    let updated = 0;
    for (const r of results) {
      const { result } = r;
      if (result.status === 'failed') {
        await c.query(
          `UPDATE spots SET ocean_calc_status='failed', ocean_calculated_at=NOW() WHERE id=$1`,
          [r.id],
        );
      } else {
        await c.query(
          `UPDATE spots
             SET ocean_latitude=$1, ocean_longitude=$2,
                 coast_facing_deg_auto=$3, ocean_calc_status=$4,
                 ocean_calculated_at=NOW()
           WHERE id=$5`,
          [result.oceanLat, result.oceanLng, result.coastFacingDegAuto, result.status, r.id],
        );
        updated++;
      }
    }
    console.log(`   ✅ ${updated}개 ocean point + ${results.length - updated}개 failed 마킹`);
  } else {
    console.log('\n💡 DB 적용: node scripts/calculate-ocean-points.js --apply');
  }

  await c.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
