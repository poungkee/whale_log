// Phase 1: OSM 해안선 데이터 다운로드 (Overpass API)
//
// 한국 + 발리 bbox 내 모든 해안선(natural=coastline)을 fetch
// → GeoJSON으로 변환 → backend/data/ 저장
//
// 한 번 실행 후 결과 파일은 git commit. 재실행 불필요.
//
// 방어 로직:
// - 큰 bbox는 분할 쿼리 (timeout 방지)
// - 재시도 3회 (Overpass 부하 시)
// - 결과 features 0개 시 명시적 에러
//
// 검증:
// - 한국 예상: 1000~5000개 way (해안선 길이상)
// - 발리 예상: 200~500개 way

const https = require('https');
const fs = require('fs');
const path = require('path');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// bbox: [south, west, north, east]
// 한국은 분할 (제주/남해/동해/서해) — Overpass 부하 방지
const REGIONS = [
  { name: 'korea-east', bbox: [35.0, 128.5, 38.7, 130.0] },   // 동해안 (포항~고성)
  { name: 'korea-south', bbox: [33.0, 126.0, 35.5, 129.5] },  // 남해안 (목포~부산, 제주 포함)
  { name: 'korea-west', bbox: [34.5, 124.5, 38.0, 127.0] },   // 서해안 (군산~파주)
  { name: 'bali', bbox: [-9.0, 114.4, -8.0, 115.8] },         // 발리 전체
];

function fetchOverpass(bbox, attempt = 1) {
  return new Promise((resolve, reject) => {
    const [s, w, n, e] = bbox;
    const query = `[out:json][timeout:180];(way["natural"="coastline"](${s},${w},${n},${e}););out geom;`;
    const data = `data=${encodeURIComponent(query)}`;

    const req = https.request(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'WhaleLog-OceanPoint/1.0',
      },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 429 || res.statusCode === 504) {
          // rate limit / timeout → 재시도
          if (attempt < 3) {
            console.log(`   ⏳ ${res.statusCode} → ${attempt + 1}회 재시도 (10초 후)`);
            setTimeout(() => fetchOverpass(bbox, attempt + 1).then(resolve, reject), 10000);
            return;
          }
          return reject(new Error(`HTTP ${res.statusCode} (재시도 ${attempt}회 실패)`));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse 실패: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(200000, () => {
      req.destroy(new Error('client timeout 200s'));
    });
    req.write(data);
    req.end();
  });
}

function osmToGeoJSON(osmData) {
  const features = [];
  for (const el of osmData.elements || []) {
    if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { osm_id: el.id },
        geometry: {
          type: 'LineString',
          coordinates: el.geometry.map(p => [p.lon, p.lat]),
        },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

(async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 ${dataDir} 생성`);
  }

  let totalFeatures = 0;
  for (const region of REGIONS) {
    console.log(`\n📡 ${region.name} 해안선 다운로드 중... (bbox: ${region.bbox.join(', ')})`);
    const t0 = Date.now();
    try {
      const osm = await fetchOverpass(region.bbox);
      const geojson = osmToGeoJSON(osm);

      if (geojson.features.length === 0) {
        console.log(`   ⚠️ ${region.name}: way 0개 — bbox 또는 쿼리 문제 의심`);
        continue;
      }

      const filepath = path.join(dataDir, `coastlines-${region.name}.geojson`);
      fs.writeFileSync(filepath, JSON.stringify(geojson));
      const size = (fs.statSync(filepath).size / 1024).toFixed(0);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`   ✅ ${region.name}: ${geojson.features.length}개 way, ${size}KB (${elapsed}s)`);
      console.log(`   저장: ${filepath}`);
      totalFeatures += geojson.features.length;
    } catch (e) {
      console.error(`   ❌ ${region.name} 실패: ${e.message}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`총 ${totalFeatures}개 해안선 way 다운로드 완료`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
