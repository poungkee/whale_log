// 카카오 로컬 API로 국내 스팟 좌표 자동 검증 + 보정 (READ-ONLY 검증)
//
// 동작:
// 1. DB에서 국내 스팟 가져오기 (발리 제외)
// 2. 각 스팟 이름으로 카카오 검색
// 3. DB 좌표 vs 카카오 결과 거리 계산
// 4. 분류:
//    ✅ 일치 (50m 이내)
//    ⚠️ 미세 차이 (50~200m, 보정 권장)
//    ❌ 큰 차이 (>200m, 자동 보정 또는 수동 검토)
//    ❓ 못 찾음 (수동 검토)

const { Client } = require('pg');
const https = require('https');

const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';
const KAKAO_KEY = 'b70df9f595f363cd8fbfb637d1e19ca9';

/** Haversine 거리 계산 (m) */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/** 카카오 로컬 API 검색 */
async function kakaoSearch(query) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(query);
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${q}&size=5`;
    https.get(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.documents || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/** 가장 가까운 결과 선택 (DB 좌표 기준) */
function pickClosest(results, dbLat, dbLng) {
  if (!results.length) return null;
  let best = null;
  let minDist = Infinity;
  for (const r of results) {
    const lat = parseFloat(r.y);
    const lng = parseFloat(r.x);
    const dist = haversineDistance(dbLat, dbLng, lat, lng);
    if (dist < minDist) {
      minDist = dist;
      best = { ...r, lat, lng, distance: dist };
    }
  }
  return best;
}

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  const { rows } = await c.query(`
    SELECT id, name, region, latitude, longitude, coast_facing_deg
    FROM spots
    WHERE is_active=true
      AND region NOT LIKE '%Bali%'
      AND region NOT LIKE '%발리%'
    ORDER BY region, name
  `);

  console.log(`총 국내 스팟 ${rows.length}개 검증 시작\n`);

  const exact = [];     // 50m 이내
  const minor = [];     // 50~200m
  const major = [];     // >200m
  const notFound = [];  // 못 찾음

  for (let i = 0; i < rows.length; i++) {
    const spot = rows[i];
    const dbLat = Number(spot.latitude);
    const dbLng = Number(spot.longitude);
    process.stdout.write(`\r[${i+1}/${rows.length}] ${spot.name}${' '.repeat(40)}`);

    try {
      // 카카오 API rate limit (관대) — 100ms
      await new Promise(r => setTimeout(r, 100));
      const results = await kakaoSearch(spot.name);

      if (!results.length) {
        // 더 짧은 검색어로 재시도 (예: "양양 죽도해변" → "죽도해변")
        const shortName = spot.name.replace(/^[가-힣]+ /, '');
        if (shortName && shortName !== spot.name) {
          await new Promise(r => setTimeout(r, 100));
          const retry = await kakaoSearch(shortName);
          if (retry.length) {
            const best = pickClosest(retry, dbLat, dbLng);
            classifyResult(spot, best, exact, minor, major);
            continue;
          }
        }
        notFound.push({ ...spot, dbLat, dbLng });
        continue;
      }

      const best = pickClosest(results, dbLat, dbLng);
      classifyResult(spot, best, exact, minor, major);
    } catch (e) {
      // skip on error
    }
  }

  function classifyResult(spot, best, exact, minor, major) {
    if (!best) return;
    const item = {
      id: spot.id,
      name: spot.name,
      region: spot.region,
      dbLat: Number(spot.latitude),
      dbLng: Number(spot.longitude),
      kakaoLat: best.lat,
      kakaoLng: best.lng,
      kakaoName: best.place_name,
      kakaoAddr: best.address_name || best.road_address_name || '',
      category: best.category_name,
      distance: best.distance,
    };
    if (best.distance < 50) exact.push(item);
    else if (best.distance < 200) minor.push(item);
    else major.push(item);
  }

  console.log('\n\n=== 결과 ===\n');
  console.log(`✅ 일치 (50m 이내): ${exact.length}개`);
  console.log(`⚠️ 미세 차이 (50~200m): ${minor.length}개`);
  console.log(`❌ 큰 차이 (>200m): ${major.length}개`);
  console.log(`❓ 못 찾음: ${notFound.length}개`);
  console.log(`총 ${rows.length}개\n`);

  if (major.length > 0) {
    console.log('\n=== 큰 차이 (자동 보정 후보) ===');
    major.sort((a, b) => b.distance - a.distance);
    major.forEach(s => {
      console.log(`\n📍 ${s.name} (${s.region})`);
      console.log(`   DB:    (${s.dbLat}, ${s.dbLng})`);
      console.log(`   카카오: (${s.kakaoLat}, ${s.kakaoLng}) ${s.kakaoName}`);
      console.log(`   주소:  ${s.kakaoAddr}`);
      console.log(`   카테고리: ${s.category}`);
      console.log(`   거리: ${(s.distance/1000).toFixed(2)}km`);
    });
  }

  if (minor.length > 0) {
    console.log('\n=== 미세 차이 (검토 권장) ===');
    minor.sort((a, b) => b.distance - a.distance);
    minor.slice(0, 10).forEach(s => {
      console.log(`📍 ${s.name}: ${s.distance.toFixed(0)}m 차이 — 카카오: ${s.kakaoAddr}`);
    });
    if (minor.length > 10) console.log(`... +${minor.length - 10}개`);
  }

  if (notFound.length > 0) {
    console.log('\n=== 못 찾음 ===');
    notFound.forEach(s => console.log(`📍 ${s.name} (${s.region})`));
  }

  // 결과 JSON 저장 (다음 단계 자동 보정용)
  const fs = require('fs');
  fs.writeFileSync(
    'D:/workspace/surf-wave-backend/scripts/kakao-verification.json',
    JSON.stringify({ exact, minor, major, notFound }, null, 2),
    'utf8'
  );
  console.log('\n결과 저장: scripts/kakao-verification.json');

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
