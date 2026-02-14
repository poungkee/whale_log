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
        // 기존 스팟 업데이트 (좌표, 지역, 설명, 브레이크타입, 스웰방향, 시즌 등 최신 데이터로 갱신)
        await client.query(
          `UPDATE spots
           SET description = $1, latitude = $2, longitude = $3,
               address = $4, region = $5, difficulty = $6,
               amenities = $7, break_type = $8, best_swell_direction = $9,
               season = $10, updated_at = NOW()
           WHERE name = $11`,
          [
            spot.description,
            spot.latitude,
            spot.longitude,
            spot.address,
            spot.region,
            spot.difficulty,
            JSON.stringify(spot.amenities),
            spot.breakType || null,
            spot.bestSwellDirection || null,
            spot.season || null,
            spot.name,
          ],
        );
        console.log(`  UPDATE: ${spot.name}`);
        updateCount++;
      } else {
        // 새 스팟 삽입
        await client.query(
          `INSERT INTO spots (id, name, description, latitude, longitude, address, region, difficulty, amenities, break_type, best_swell_direction, season, is_active, rating, rating_count, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 0, 0, NOW(), NOW())`,
          [
            spot.name,
            spot.description,
            spot.latitude,
            spot.longitude,
            spot.address,
            spot.region,
            spot.difficulty,
            JSON.stringify(spot.amenities),
            spot.breakType || null,
            spot.bestSwellDirection || null,
            spot.season || null,
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
