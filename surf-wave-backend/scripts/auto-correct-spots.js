// 카카오 로컬 API 카테고리 필터 + 자동 보정
//
// 동작:
// 1. 모든 국내 스팟 검색 (5개 결과 수집)
// 2. 카테고리에 "해수욕장" 또는 "해변" 포함된 결과 우선 선택
// 3. 거리 차이 >100m 이면 안전 자동 보정 (DRY_RUN=false 시 DB 업데이트)
// 4. 모호한 케이스 + 못 찾음 → 수동 검토 리스트

const { Client } = require('pg');
const https = require('https');

const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';
const KAKAO_KEY = 'b70df9f595f363cd8fbfb637d1e19ca9';

const DRY_RUN = process.argv.includes('--apply') ? false : true;

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function kakaoSearch(query) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(query);
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${q}&size=10`;
    https.get(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).documents || []); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/** 결과 중 "해수욕장,해변" 카테고리 우선 선택 */
function pickBestResult(results, dbLat, dbLng, spotName) {
  if (!results.length) return null;

  // 1순위: 해수욕장,해변 카테고리 + 이름이 정확히 매칭
  const beachExact = results.find(r =>
    r.category_name?.includes('해수욕장') &&
    r.place_name === spotName
  );
  if (beachExact) {
    return enrichResult(beachExact, dbLat, dbLng, 'BEACH_EXACT');
  }

  // 2순위: 해수욕장,해변 카테고리 + 이름 부분 매칭
  const beachLike = results.find(r =>
    r.category_name?.includes('해수욕장') &&
    (r.place_name.includes(spotName.replace(/^[가-힣]+ /, '')) ||
     spotName.includes(r.place_name.replace(/해수욕장$/, '해변')))
  );
  if (beachLike) {
    return enrichResult(beachLike, dbLat, dbLng, 'BEACH_LIKE');
  }

  // 3순위: 해수욕장,해변 카테고리 + 가장 가까운
  const beaches = results.filter(r => r.category_name?.includes('해수욕장') || r.category_name?.includes('해변'));
  if (beaches.length) {
    const closest = beaches.reduce((best, r) => {
      const dist = haversine(dbLat, dbLng, parseFloat(r.y), parseFloat(r.x));
      return !best || dist < best.distance ? { ...r, distance: dist } : best;
    }, null);
    return enrichResult(closest, dbLat, dbLng, 'BEACH_NEAREST');
  }

  // 4순위: 그냥 가장 가까운 결과 (펜션/편의점 등)
  const closest = results.reduce((best, r) => {
    const dist = haversine(dbLat, dbLng, parseFloat(r.y), parseFloat(r.x));
    return !best || dist < best.distance ? { ...r, distance: dist } : best;
  }, null);
  return enrichResult(closest, dbLat, dbLng, 'OTHER_NEAREST');
}

function enrichResult(r, dbLat, dbLng, matchType) {
  const lat = parseFloat(r.y);
  const lng = parseFloat(r.x);
  return {
    lat, lng,
    placeName: r.place_name,
    address: r.address_name || r.road_address_name || '',
    category: r.category_name,
    distance: haversine(dbLat, dbLng, lat, lng),
    matchType,
  };
}

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  const { rows } = await c.query(`
    SELECT id, name, region, latitude, longitude
    FROM spots
    WHERE is_active=true AND region NOT LIKE '%Bali%' AND region NOT LIKE '%발리%'
    ORDER BY region, name
  `);

  console.log(`🔍 ${rows.length}개 국내 스팟 검증 (모드: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'})\n`);

  const autoCorrect = [];   // 자동 보정 (BEACH_EXACT 또는 BEACH_LIKE)
  const reviewNeeded = [];  // 수동 검토 (BEACH_NEAREST, OTHER_NEAREST, 못찾음)
  const noChange = [];      // 변경 불필요 (50m 이내)

  for (let i = 0; i < rows.length; i++) {
    const spot = rows[i];
    const dbLat = Number(spot.latitude);
    const dbLng = Number(spot.longitude);
    process.stdout.write(`\r[${i+1}/${rows.length}] ${spot.name}${' '.repeat(40)}`);

    try {
      await new Promise(r => setTimeout(r, 100));
      let results = await kakaoSearch(spot.name);

      // 못 찾으면 짧은 이름으로 재시도
      if (!results.length) {
        const shortName = spot.name.replace(/^[가-힣]+ /, '');
        if (shortName !== spot.name) {
          await new Promise(r => setTimeout(r, 100));
          results = await kakaoSearch(shortName);
        }
      }

      if (!results.length) {
        reviewNeeded.push({ ...spot, dbLat, dbLng, reason: 'NOT_FOUND' });
        continue;
      }

      const best = pickBestResult(results, dbLat, dbLng, spot.name);
      if (!best) {
        reviewNeeded.push({ ...spot, dbLat, dbLng, reason: 'NO_MATCH' });
        continue;
      }

      const item = { ...spot, dbLat, dbLng, best };

      // 50m 이내: 변경 불필요
      if (best.distance < 50) {
        noChange.push(item);
        continue;
      }

      // 자동 보정: BEACH_EXACT, BEACH_LIKE만 (정확한 매칭)
      if (best.matchType === 'BEACH_EXACT' || best.matchType === 'BEACH_LIKE') {
        autoCorrect.push(item);
        continue;
      }

      // 그 외: 수동 검토
      reviewNeeded.push({ ...item, reason: 'NEEDS_REVIEW' });
    } catch (e) {
      reviewNeeded.push({ ...spot, dbLat, dbLng, reason: 'ERROR: ' + e.message });
    }
  }

  console.log('\n\n📊 결과:');
  console.log(`  ✅ 변경 불필요 (50m 이내): ${noChange.length}개`);
  console.log(`  🔄 자동 보정 후보: ${autoCorrect.length}개`);
  console.log(`  ⚠️ 수동 검토 필요: ${reviewNeeded.length}개`);

  // 자동 보정 적용
  if (autoCorrect.length > 0) {
    console.log('\n🔄 자동 보정 후보:');
    autoCorrect.forEach(s => {
      console.log(`  • ${s.name} (${s.region})`);
      console.log(`    ${s.dbLat.toFixed(4)}, ${s.dbLng.toFixed(4)} → ${s.best.lat.toFixed(4)}, ${s.best.lng.toFixed(4)}`);
      console.log(`    거리: ${s.best.distance.toFixed(0)}m | ${s.best.placeName} (${s.best.matchType})`);
    });

    if (!DRY_RUN) {
      console.log('\n💾 DB 업데이트 적용 중...');
      for (const s of autoCorrect) {
        await c.query(
          'UPDATE spots SET latitude=$1, longitude=$2 WHERE id=$3',
          [s.best.lat.toFixed(7), s.best.lng.toFixed(7), s.id]
        );
        console.log(`  ✓ ${s.name}`);
      }
      console.log(`\n✅ ${autoCorrect.length}개 자동 보정 완료`);
    } else {
      console.log('\n💡 적용하려면: node scripts/auto-correct-spots.js --apply');
    }
  }

  if (reviewNeeded.length > 0) {
    console.log('\n⚠️ 수동 검토 필요:\n');
    reviewNeeded.forEach(s => {
      console.log(`📍 ${s.name} (${s.region}) — ${s.reason}`);
      if (s.best) {
        console.log(`   DB:    ${s.dbLat}, ${s.dbLng}`);
        console.log(`   카카오: ${s.best.lat}, ${s.best.lng} — ${s.best.placeName}`);
        console.log(`   주소:  ${s.best.address}`);
        console.log(`   카테고리: ${s.best.category}`);
        console.log(`   거리: ${s.best.distance.toFixed(0)}m`);
      }
      console.log();
    });
  }

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
