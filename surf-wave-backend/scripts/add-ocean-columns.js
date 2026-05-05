// spots 테이블에 ocean point 관련 컬럼 추가
// 멱등성 보장 (IF NOT EXISTS)

const { Client } = require('pg');
const DB_URL = 'postgresql://postgres:dmgStqyqxXHwFWmvxvLEBfJqaciPmpYE@roundhouse.proxy.rlwy.net:37055/railway';

(async () => {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  console.log('🔧 spots 테이블 컬럼 추가...');
  await c.query(`
    ALTER TABLE spots
      ADD COLUMN IF NOT EXISTS ocean_latitude DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS ocean_longitude DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS coast_facing_deg_auto DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS ocean_calc_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ocean_calculated_at TIMESTAMP
  `);
  console.log('✅ 컬럼 5개 추가 완료');

  // 검증
  const { rows } = await c.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name='spots' AND column_name LIKE 'ocean%' OR column_name = 'coast_facing_deg_auto'
    ORDER BY column_name
  `);
  console.log('\n📋 추가된 컬럼:');
  rows.forEach(r => console.log(`   ${r.column_name} (${r.data_type})`));

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
