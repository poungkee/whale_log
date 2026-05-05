// 사용자가 지적한 10개 스팟의 좌표/coastFacingDeg 점검
// 카카오 API로 실제 위치와 비교 → 좌표/방향 문제 진단

const { Client } = require('pg');
const https = require('https');

const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';
const KAKAO_KEY = 'b70df9f595f363cd8fbfb637d1e19ca9';

const TARGET_NAMES = [
  '제주 표선해변', '표선해변',
  '강릉 사천해변', '사천해변',
  '양양 38도선해변', '38도선해변',
  '제주 중문해변', '중문해변',
  '부산 송정해변', '송정해변',
  '양양 서피비치', '서피비치',
  '동해 망상해변', '망상해변',
  '태안 만리포해변', '만리포해변',
  '고흥 남열해변', '남열해변',
  '부산 다대포해변', '다대포해변',
];

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
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`;
    https.get(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const docs = JSON.parse(data).documents || [];
          // 해수욕장/해변 카테고리 우선
          const beach = docs.find(r => r.category_name?.includes('해수욕장') || r.category_name?.includes('해변'));
          resolve(beach || docs[0] || null);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  // DB에서 해당 스팟들 조회
  const { rows } = await c.query(`
    SELECT id, name, region, latitude::float as lat, longitude::float as lng, coast_facing_deg
    FROM spots
    WHERE name = ANY($1::text[])
    ORDER BY region, name
  `, [TARGET_NAMES]);

  console.log(`\n📋 DB 조회 결과: ${rows.length}개\n`);

  for (const spot of rows) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 ${spot.name} (${spot.region})`);
    console.log(`   DB:           ${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}`);
    console.log(`   coastFacingDeg: ${spot.coast_facing_deg}° (${getDirLabel(spot.coast_facing_deg)})`);

    // 카카오로 실제 위치 검증
    try {
      await new Promise(r => setTimeout(r, 200));
      const found = await kakaoSearch(spot.name);
      if (found) {
        const kLat = parseFloat(found.y);
        const kLng = parseFloat(found.x);
        const dist = haversine(spot.lat, spot.lng, kLat, kLng);
        console.log(`   카카오:        ${kLat.toFixed(6)}, ${kLng.toFixed(6)} (${found.place_name})`);
        console.log(`   ⚠️ 거리 차이: ${dist.toFixed(0)}m ${dist > 200 ? '🔴' : dist > 50 ? '🟡' : '🟢'}`);
        console.log(`   카테고리:      ${found.category_name}`);
      } else {
        console.log(`   ❌ 카카오에서 못 찾음`);
      }
    } catch (e) {
      console.log(`   ⚠️ 카카오 에러: ${e.message}`);
    }
    console.log();
  }

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });

function getDirLabel(deg) {
  if (deg == null) return 'NULL';
  const dirs = ['북','북동','동','남동','남','남서','서','북서'];
  return dirs[Math.round(deg / 45) % 8];
}
