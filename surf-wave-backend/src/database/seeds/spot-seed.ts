/**
 * @file spot-seed.ts
 * @description 서핑 스팟 시드 - spots-data.json에서 읽어 DB에 upsert
 *
 * 실행: npm run seed:spots
 * - 새 스팟: INSERT
 * - 기존 스팟 (이름 일치): UPDATE (좌표, 지역, 설명 등 갱신)
 * - 스팟 데이터 수정은 spots-data.json만 편집하면 됨
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/** spots-data.json 파일에서 스팟 데이터 로드 */
const dataPath = path.join(__dirname, 'spots-data.json');
const spots = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'surfwave',
    password: process.env.DB_PASSWORD || 'surfwave123',
    database: process.env.DB_DATABASE || 'surfwave',
  });

  try {
    await client.connect();
    console.log(`Database connected — ${spots.length}개 스팟 처리 시작\n`);

    let insertCount = 0;
    let updateCount = 0;

    for (const spot of spots) {
      const check = await client.query(
        'SELECT id FROM spots WHERE name = $1',
        [spot.name],
      );

      if (check.rows.length > 0) {
        // 기존 스팟 업데이트 (v1.3 계산 로직용 전체 고정 속성 갱신)
        // 파고 override(optimal/tolerable) 포함
        await client.query(
          `UPDATE spots
           SET description = $1, latitude = $2, longitude = $3,
               address = $4, region = $5, difficulty = $6,
               amenities = $7, break_type = $8, best_swell_direction = $9,
               season = $10, coast_facing_deg = $11, best_swell_spread_deg = $12,
               optimal_wave_min = $13, optimal_wave_max = $14,
               tolerable_wave_min = $15, tolerable_wave_max = $16,
               updated_at = NOW()
           WHERE name = $17`,
          [
            spot.description,                   // $1
            spot.latitude,                      // $2
            spot.longitude,                     // $3
            spot.address,                       // $4
            spot.region,                        // $5
            spot.difficulty,                    // $6
            JSON.stringify(spot.amenities),     // $7
            spot.breakType || null,             // $8
            spot.bestSwellDirection || null,    // $9
            spot.season || null,                // $10
            spot.coastFacingDeg ?? null,        // $11
            spot.bestSwellSpreadDeg ?? null,    // $12
            spot.optimalWaveMin ?? null,        // $13 - 파고 override
            spot.optimalWaveMax ?? null,        // $14
            spot.tolerableWaveMin ?? null,      // $15
            spot.tolerableWaveMax ?? null,      // $16
            spot.name,                          // $17
          ],
        );
        console.log(`  UPDATE: ${spot.name}`);
        updateCount++;
      } else {
        // 새 스팟 삽입 (v1.3 계산 로직용 전체 컬럼 포함)
        // $1~$17: name ~ tolerableWaveMax
        await client.query(
          `INSERT INTO spots (id, name, description, latitude, longitude, address, region, difficulty, amenities, break_type, best_swell_direction, season, coast_facing_deg, best_swell_spread_deg, optimal_wave_min, optimal_wave_max, tolerable_wave_min, tolerable_wave_max, is_active, rating, rating_count, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, 0, 0, NOW(), NOW())`,
          [
            spot.name,                          // $1
            spot.description,                   // $2
            spot.latitude,                      // $3
            spot.longitude,                     // $4
            spot.address,                       // $5
            spot.region,                        // $6
            spot.difficulty,                    // $7
            JSON.stringify(spot.amenities),     // $8
            spot.breakType || null,             // $9
            spot.bestSwellDirection || null,    // $10
            spot.season || null,                // $11
            spot.coastFacingDeg ?? null,        // $12
            spot.bestSwellSpreadDeg ?? null,    // $13
            spot.optimalWaveMin ?? null,        // $14 - 파고 override
            spot.optimalWaveMax ?? null,        // $15
            spot.tolerableWaveMin ?? null,      // $16
            spot.tolerableWaveMax ?? null,      // $17
          ],
        );
        console.log(`  INSERT: ${spot.name}`);
        insertCount++;
      }
    }

    console.log(`\n완료: ${insertCount}개 추가, ${updateCount}개 갱신 (총 ${spots.length}개)`);
  } catch (error) {
    console.error('Seed 실패:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
