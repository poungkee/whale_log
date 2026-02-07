/**
 * @file test-forecast-pipeline.ts
 * @description 예보 파이프라인 수동 검증 스크립트
 *
 * 검증 항목:
 * 1. API 안정성: Marine + Weather 응답 확인 (한국/발리)
 * 2. 시간축 병합: wave/swell + wind 동일 시간 머지
 * 3. DB Upsert: (spot_id, forecast_time) 기준 중복 방지
 */
import { Client } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

interface SpotRow {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  region: string;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'surfwave',
    password: process.env.DB_PASSWORD || 'surfwave123',
    database: process.env.DB_DATABASE || 'surfwave',
  });

  await client.connect();
  console.log('=== Whale Log 예보 파이프라인 검증 ===\n');

  // 한국 1개 + 발리 1개 테스트
  const result = await client.query<SpotRow>(
    `SELECT id, name, latitude, longitude, region FROM spots
     WHERE name IN ('양양 서피비치', 'Kuta Beach') AND is_active = true`,
  );
  const testSpots = result.rows;
  console.log(`테스트 스팟: ${testSpots.map((s) => s.name).join(', ')}\n`);

  for (const spot of testSpots) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`스팟: ${spot.name} (${spot.region})`);
    console.log(`좌표: ${spot.latitude}, ${spot.longitude}`);
    console.log(`${'='.repeat(60)}`);

    const lat = parseFloat(spot.latitude);
    const lng = parseFloat(spot.longitude);

    // ============================================================
    // 검증 1: API 안정성
    // ============================================================
    console.log('\n--- [검증 1] API 안정성 ---');

    let marineData: any;
    let weatherData: any;

    try {
      const marineRes = await axios.get(MARINE_URL, {
        params: {
          latitude: lat,
          longitude: lng,
          hourly: 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
          timezone: 'auto',
          forecast_days: 2,
        },
      });
      marineData = marineRes.data;
      console.log(`  Marine API: OK (${marineData.hourly.time.length}시간)`);
    } catch (e: any) {
      console.log(`  Marine API: FAIL - ${e.message}`);
      continue;
    }

    try {
      const weatherRes = await axios.get(WEATHER_URL, {
        params: {
          latitude: lat,
          longitude: lng,
          hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
          timezone: 'auto',
          forecast_days: 2,
        },
      });
      weatherData = weatherRes.data;
      console.log(`  Weather API: OK (${weatherData.hourly.time.length}시간)`);
    } catch (e: any) {
      console.log(`  Weather API: FAIL - ${e.message}`);
    }

    // 필드 누락 체크
    const marineFields = ['wave_height', 'wave_period', 'wave_direction', 'swell_wave_height', 'swell_wave_period', 'swell_wave_direction'];
    const weatherFields = ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'];

    const missingMarine = marineFields.filter((f) => !marineData.hourly[f]);
    const missingWeather = weatherData ? weatherFields.filter((f) => !weatherData.hourly[f]) : weatherFields;

    console.log(`  Marine 누락 필드: ${missingMarine.length === 0 ? '없음' : missingMarine.join(', ')}`);
    console.log(`  Weather 누락 필드: ${missingWeather.length === 0 ? '없음' : missingWeather.join(', ')}`);

    // null 값 카운트
    const marineNulls: Record<string, number> = {};
    for (const field of marineFields) {
      const arr = marineData.hourly[field] || [];
      marineNulls[field] = arr.filter((v: any) => v === null || v === undefined).length;
    }
    const weatherNulls: Record<string, number> = {};
    if (weatherData) {
      for (const field of weatherFields) {
        const arr = weatherData.hourly[field] || [];
        weatherNulls[field] = arr.filter((v: any) => v === null || v === undefined).length;
      }
    }
    console.log(`  Marine null 카운트:`, marineNulls);
    console.log(`  Weather null 카운트:`, weatherNulls);

    // ============================================================
    // 검증 2: 시간축 병합
    // ============================================================
    console.log('\n--- [검증 2] 시간축 병합 ---');

    const marineTimeSet = new Set(marineData.hourly.time);
    const weatherTimeSet = weatherData ? new Set(weatherData.hourly.time) : new Set();

    const commonTimes = [...marineTimeSet].filter((t) => weatherTimeSet.has(t));
    const marineOnly = [...marineTimeSet].filter((t) => !weatherTimeSet.has(t));
    const weatherOnly = [...weatherTimeSet].filter((t: any) => !marineTimeSet.has(t));

    console.log(`  Marine 시간 수: ${marineTimeSet.size}`);
    console.log(`  Weather 시간 수: ${weatherTimeSet.size}`);
    console.log(`  공통 시간 수: ${commonTimes.length}`);
    console.log(`  Marine만 있는 시간: ${marineOnly.length}`);
    console.log(`  Weather만 있는 시간: ${weatherOnly.length}`);

    // 처음 3개 시간 비교
    const first3 = (marineData.hourly.time as string[]).slice(0, 3);
    console.log(`\n  처음 3시간 샘플 (머지 결과):`);
    for (const time of first3) {
      const mi = marineData.hourly.time.indexOf(time);
      const wi = weatherData ? weatherData.hourly.time.indexOf(time) : -1;

      console.log(`    ${time}`);
      console.log(`      wave:  height=${marineData.hourly.wave_height[mi]}m, period=${marineData.hourly.wave_period[mi]}s, dir=${marineData.hourly.wave_direction[mi]}°`);
      console.log(`      swell: height=${marineData.hourly.swell_wave_height?.[mi] ?? 'null'}, period=${marineData.hourly.swell_wave_period?.[mi] ?? 'null'}, dir=${marineData.hourly.swell_wave_direction?.[mi] ?? 'null'}`);
      if (wi >= 0) {
        console.log(`      wind:  speed=${weatherData.hourly.wind_speed_10m[wi]}km/h, gusts=${weatherData.hourly.wind_gusts_10m[wi]}km/h, dir=${weatherData.hourly.wind_direction_10m[wi]}°`);
      } else {
        console.log(`      wind:  (no matching time)`);
      }
    }

    // ============================================================
    // 검증 3: DB Upsert
    // ============================================================
    console.log('\n--- [검증 3] DB Upsert ---');

    const now = new Date();
    const hours = 48;
    const count = Math.min(hours, marineData.hourly.time.length);

    // Wind map
    const windMap = new Map<string, { speed: number | null; gusts: number | null; dir: number | null }>();
    if (weatherData) {
      weatherData.hourly.time.forEach((t: string, i: number) => {
        windMap.set(t, {
          speed: weatherData.hourly.wind_speed_10m?.[i] ?? null,
          gusts: weatherData.hourly.wind_gusts_10m?.[i] ?? null,
          dir: weatherData.hourly.wind_direction_10m?.[i] ?? null,
        });
      });
    }

    // Upsert 1회차
    let upsertCount = 0;
    for (let i = 0; i < count; i++) {
      const time = marineData.hourly.time[i];
      const wind = windMap.get(time);

      await client.query(
        `INSERT INTO forecasts (id, spot_id, forecast_time, wave_height, wave_period, wave_direction,
          swell_height, swell_period, swell_direction, wind_speed, wind_gusts, wind_direction,
          fetched_at, source, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open-meteo', NOW())
         ON CONFLICT (spot_id, forecast_time)
         DO UPDATE SET wave_height=$3, wave_period=$4, wave_direction=$5,
           swell_height=$6, swell_period=$7, swell_direction=$8,
           wind_speed=$9, wind_gusts=$10, wind_direction=$11, fetched_at=$12`,
        [
          spot.id,
          new Date(time),
          marineData.hourly.wave_height?.[i] ?? 0,
          marineData.hourly.wave_period?.[i] ?? 0,
          marineData.hourly.wave_direction?.[i] ?? 0,
          marineData.hourly.swell_wave_height?.[i] ?? null,
          marineData.hourly.swell_wave_period?.[i] ?? null,
          marineData.hourly.swell_wave_direction?.[i] ?? null,
          wind?.speed ?? null,
          wind?.gusts ?? null,
          wind?.dir ?? null,
          now,
        ],
      );
      upsertCount++;
    }
    console.log(`  1회차 upsert: ${upsertCount}건`);

    // 중복 체크
    const dupCheck = await client.query(
      `SELECT spot_id, forecast_time, COUNT(*) as cnt
       FROM forecasts WHERE spot_id = $1
       GROUP BY spot_id, forecast_time HAVING COUNT(*) > 1`,
      [spot.id],
    );
    console.log(`  중복 레코드: ${dupCheck.rows.length === 0 ? '없음 (PASS)' : dupCheck.rows.length + '건 (FAIL!)'}`);

    // Upsert 2회차 (같은 데이터 다시)
    for (let i = 0; i < count; i++) {
      const time = marineData.hourly.time[i];
      const wind = windMap.get(time);

      await client.query(
        `INSERT INTO forecasts (id, spot_id, forecast_time, wave_height, wave_period, wave_direction,
          swell_height, swell_period, swell_direction, wind_speed, wind_gusts, wind_direction,
          fetched_at, source, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open-meteo', NOW())
         ON CONFLICT (spot_id, forecast_time)
         DO UPDATE SET wave_height=$3, wave_period=$4, wave_direction=$5,
           swell_height=$6, swell_period=$7, swell_direction=$8,
           wind_speed=$9, wind_gusts=$10, wind_direction=$11, fetched_at=$12`,
        [
          spot.id,
          new Date(time),
          marineData.hourly.wave_height?.[i] ?? 0,
          marineData.hourly.wave_period?.[i] ?? 0,
          marineData.hourly.wave_direction?.[i] ?? 0,
          marineData.hourly.swell_wave_height?.[i] ?? null,
          marineData.hourly.swell_wave_period?.[i] ?? null,
          marineData.hourly.swell_wave_direction?.[i] ?? null,
          wind?.speed ?? null,
          wind?.gusts ?? null,
          wind?.dir ?? null,
          now,
        ],
      );
    }
    console.log(`  2회차 upsert: ${upsertCount}건 (덮어쓰기)`);

    // 2회차 후 중복 체크
    const dupCheck2 = await client.query(
      `SELECT spot_id, forecast_time, COUNT(*) as cnt
       FROM forecasts WHERE spot_id = $1
       GROUP BY spot_id, forecast_time HAVING COUNT(*) > 1`,
      [spot.id],
    );
    console.log(`  2회차 후 중복: ${dupCheck2.rows.length === 0 ? '없음 (PASS)' : dupCheck2.rows.length + '건 (FAIL!)'}`);

    // 총 레코드 수
    const totalCount = await client.query(
      'SELECT COUNT(*) as cnt FROM forecasts WHERE spot_id = $1',
      [spot.id],
    );
    console.log(`  총 레코드 수: ${totalCount.rows[0].cnt}건 (기대값: ${count})`);

    // DB에서 처음 5개 레코드 확인
    const sample = await client.query(
      `SELECT forecast_time, wave_height, wave_period, wave_direction,
              swell_height, swell_period, swell_direction,
              wind_speed, wind_gusts, wind_direction
       FROM forecasts WHERE spot_id = $1
       ORDER BY forecast_time LIMIT 5`,
      [spot.id],
    );
    console.log(`\n  DB 저장 결과 (처음 5시간):`);
    for (const row of sample.rows) {
      const ft = new Date(row.forecast_time).toISOString().replace('.000Z', '');
      console.log(`    ${ft}`);
      console.log(`      wave:  h=${row.wave_height}m, p=${row.wave_period}s, d=${row.wave_direction}°`);
      console.log(`      swell: h=${row.swell_height ?? 'null'}, p=${row.swell_period ?? 'null'}, d=${row.swell_direction ?? 'null'}`);
      console.log(`      wind:  s=${row.wind_speed ?? 'null'}km/h, g=${row.wind_gusts ?? 'null'}km/h, d=${row.wind_direction ?? 'null'}°`);
    }

    // null 비율 체크
    const nullStats = await client.query(
      `SELECT
        COUNT(*) as total,
        COUNT(wave_height) as wave_ok,
        COUNT(swell_height) as swell_ok,
        COUNT(wind_speed) as wind_ok
       FROM forecasts WHERE spot_id = $1`,
      [spot.id],
    );
    const stats = nullStats.rows[0];
    console.log(`\n  null 비율 체크:`);
    console.log(`    wave 채워짐: ${stats.wave_ok}/${stats.total} (${Math.round((stats.wave_ok / stats.total) * 100)}%)`);
    console.log(`    swell 채워짐: ${stats.swell_ok}/${stats.total} (${Math.round((stats.swell_ok / stats.total) * 100)}%)`);
    console.log(`    wind 채워짐: ${stats.wind_ok}/${stats.total} (${Math.round((stats.wind_ok / stats.total) * 100)}%)`);
  }

  // ============================================================
  // 최종 판정
  // ============================================================
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('최종 검증 결과');
  console.log(`${'='.repeat(60)}`);

  const totalForecasts = await client.query('SELECT COUNT(*) as cnt FROM forecasts');
  const totalSpots = await client.query('SELECT COUNT(DISTINCT spot_id) as cnt FROM forecasts');
  const dups = await client.query(
    `SELECT spot_id, forecast_time, COUNT(*) as cnt
     FROM forecasts GROUP BY spot_id, forecast_time HAVING COUNT(*) > 1`,
  );

  console.log(`  총 예보 레코드: ${totalForecasts.rows[0].cnt}`);
  console.log(`  예보 있는 스팟: ${totalSpots.rows[0].cnt}`);
  console.log(`  중복 레코드: ${dups.rows.length === 0 ? '0건 ✅' : dups.rows.length + '건 ❌'}`);

  await client.end();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
