// Railway PostgreSQL에 PostGIS extension 활성화 가능 여부 확인
// - 1. 현재 설치된 extension 목록
// - 2. PostGIS 사용 가능 여부 (pg_available_extensions)
// - 3. CREATE EXTENSION 시도

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣ PostgreSQL 버전');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const ver = await c.query('SELECT version()');
  console.log('  ', ver.rows[0].version);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣ 현재 설치된 extension');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const installed = await c.query(`
    SELECT extname, extversion FROM pg_extension ORDER BY extname
  `);
  installed.rows.forEach(r => console.log(`   • ${r.extname} (${r.extversion})`));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣ 사용 가능한 PostGIS 관련 extension');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const available = await c.query(`
    SELECT name, default_version, installed_version, comment
    FROM pg_available_extensions
    WHERE name LIKE '%postgis%' OR name LIKE '%gis%' OR name LIKE '%geo%'
    ORDER BY name
  `);
  if (available.rows.length === 0) {
    console.log('   ❌ PostGIS 관련 extension 없음');
  } else {
    available.rows.forEach(r => {
      const status = r.installed_version ? '✅ 설치됨' : '⚪ 사용 가능';
      console.log(`   ${status} ${r.name} (default ${r.default_version})`);
      if (r.comment) console.log(`        ${r.comment}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣ PostGIS CREATE EXTENSION 시도');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    await c.query('CREATE EXTENSION IF NOT EXISTS postgis');
    console.log('   ✅ 성공');
    const v = await c.query('SELECT PostGIS_Version()');
    console.log(`   PostGIS 버전: ${v.rows[0].postgis_version}`);

    // 추가 함수 sanity check
    const test = await c.query(`
      SELECT ST_AsText(ST_MakePoint(126.94, 37.43)) as point
    `);
    console.log(`   ST_MakePoint 테스트: ${test.rows[0].point}`);
  } catch (e) {
    console.log('   ❌ 실패');
    console.log(`   에러: ${e.message}`);
    if (e.code) console.log(`   코드: ${e.code}`);
  }

  await c.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
