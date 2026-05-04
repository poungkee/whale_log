// geoArrow 좌표 계산 검증 (Task #84)
const EARTH_RADIUS_M = 6371000;

function arrowEndPoint(lat, lng, bearingDeg, distanceM) {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = bearingDeg * Math.PI / 180;
  const φ1 = lat * Math.PI / 180;
  const λ1 = lng * Math.PI / 180;
  const φ2 = Math.asin(Math.sin(φ1)*Math.cos(δ) + Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1), Math.cos(δ) - Math.sin(φ1)*Math.sin(φ2));
  return { lat: φ2*180/Math.PI, lng: (((λ2*180/Math.PI)+540)%360)-180 };
}

const cases = [
  // [name, lat, lng, bearing, distance, expectedLatChange, expectedLngChange]
  ['동향 250m (경도+)', 37.9756, 128.7596, 90, 250, 0, '+'],
  ['서향 250m (경도-)', 37.9756, 128.7596, 270, 250, 0, '-'],
  ['북향 250m (위도+)', 37.9756, 128.7596, 0, 250, '+', 0],
  ['남향 250m (위도-)', 37.9756, 128.7596, 180, 250, '-', 0],
  ['발리 적도 근처 동향', -8.8095, 115.0888, 90, 500, 0, '+'],
];

console.log('=== geoArrow 좌표 계산 검증 ===\n');
let pass = 0;
cases.forEach(([name, lat, lng, bearing, dist, expLat, expLng]) => {
  const end = arrowEndPoint(lat, lng, bearing, dist);
  const dLat = end.lat - lat;
  const dLng = end.lng - lng;

  const latOk = expLat === '+' ? dLat > 0 : expLat === '-' ? dLat < 0 : Math.abs(dLat) < 0.0001;
  const lngOk = expLng === '+' ? dLng > 0 : expLng === '-' ? dLng < 0 : Math.abs(dLng) < 0.0001;
  const ok = latOk && lngOk;
  if (ok) pass++;

  console.log(`[${ok ? '✅' : '❌'}] ${name}`);
  console.log(`     끝점: (${end.lat.toFixed(6)}, ${end.lng.toFixed(6)})`);
  console.log(`     ΔLat=${dLat > 0 ? '+' : ''}${dLat.toFixed(6)}, ΔLng=${dLng > 0 ? '+' : ''}${dLng.toFixed(6)}\n`);
});

console.log(`==========================================`);
console.log(`결과: ${pass}/${cases.length} 통과`);
console.log(`==========================================`);
