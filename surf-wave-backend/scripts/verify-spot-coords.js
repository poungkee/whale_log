// 모든 스팟 좌표 자동 검증 — Nominatim (OpenStreetMap) 무료 API
// DB 좌표 vs Nominatim 검색 결과 거리 차이 계산
// 차이 > 500m 인 스팟만 의심 케이스로 리스트업

const { Client } = require('pg');
const https = require('https');

const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';

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

/** Nominatim 검색 (지역 한정) */
async function nominatimSearch(name) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(name);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=0`;
    https.get(url, {
      headers: { 'User-Agent': 'WhaleLog/1.0 (spot-coordinate-verification)' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0) {
            resolve({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon), name: json[0].display_name });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  const { rows } = await c.query(`
    SELECT id, name, region, latitude, longitude, coast_facing_deg
    FROM spots WHERE is_active=true ORDER BY region, name
  `);

  console.log(`총 ${rows.length}개 스팟 검증 시작\n`);
  const suspects = [];
  let count = 0;

  for (const spot of rows) {
    count++;
    process.stdout.write(`\r[${count}/${rows.length}] ${spot.name}${' '.repeat(30)}`);
    try {
      // Nominatim 정책: 1초당 1요청
      await new Promise(r => setTimeout(r, 1100));
      const found = await nominatimSearch(spot.name);
      if (!found) {
        suspects.push({ ...spot, suspect: 'Nominatim에서 못 찾음', distance: null });
        continue;
      }
      const dist = haversineDistance(
        Number(spot.latitude), Number(spot.longitude),
        found.lat, found.lng
      );
      if (dist > 500) {
        suspects.push({
          ...spot,
          suspect: `${(dist/1000).toFixed(2)}km 차이`,
          distance: dist,
          foundLat: found.lat,
          foundLng: found.lng,
          foundName: found.name,
        });
      }
    } catch (e) {
      // skip on error
    }
  }

  console.log('\n\n=== 의심 스팟 (>500m 차이) ===\n');
  if (suspects.length === 0) {
    console.log('✅ 모든 스팟 좌표 정확 (500m 이내)');
  } else {
    suspects.sort((a, b) => (b.distance || 0) - (a.distance || 0));
    suspects.forEach(s => {
      console.log(`📍 ${s.name} (${s.region})`);
      console.log(`   DB: ${s.latitude}, ${s.longitude}`);
      if (s.foundLat) {
        console.log(`   OSM: ${s.foundLat}, ${s.foundLng}`);
        console.log(`   결과: ${s.foundName?.substring(0, 80)}`);
      }
      console.log(`   ⚠️ ${s.suspect}\n`);
    });
    console.log(`\n총 ${suspects.length}개 의심 케이스`);
  }

  await c.end();
})();
