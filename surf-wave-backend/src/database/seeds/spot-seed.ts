/**
 * @file spot-seed.ts
 * @description 서핑 스팟 시드 데이터 - 한국 8개 + 발리 8개
 *
 * 실행: npm run seed:spots
 */
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

interface SpotSeed {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  region: string;
  difficulty: string;
  amenities: Record<string, boolean>;
}

const spots: SpotSeed[] = [
  // ============================================================
  // 한국 (Korea) - 8개
  // ============================================================
  {
    name: '양양 서피비치',
    description:
      '한국 서핑의 메카. 완만한 파도와 넓은 백사장으로 초보자부터 중급자까지 즐기기 좋은 해변. 서핑 스쿨과 렌탈샵이 밀집해 있어 접근성이 뛰어남.',
    latitude: 38.0773,
    longitude: 128.6167,
    address: '강원도 양양군 현남면 인구해변길',
    region: '양양',
    difficulty: 'BEGINNER',
    amenities: { parking: true, shower: true, rental: true, lesson: true, cafe: true },
  },
  {
    name: '양양 죽도해변',
    description:
      '서피비치 북쪽에 위치한 해변. 서피비치보다 파도가 약간 세고 사람이 적어 중급 서퍼들이 선호하는 포인트.',
    latitude: 38.0935,
    longitude: 128.6318,
    address: '강원도 양양군 현북면 하광정리',
    region: '양양',
    difficulty: 'INTERMEDIATE',
    amenities: { parking: true, shower: true, rental: true },
  },
  {
    name: '양양 기사문해변',
    description:
      '양양 남쪽에 위치한 조용한 서핑 포인트. 리프 브레이크가 있어 중상급자에게 적합하며, 스웰이 좋을 때 퀄리티 높은 파도가 형성됨.',
    latitude: 37.9547,
    longitude: 128.7983,
    address: '강원도 양양군 손양면 기사문리',
    region: '양양',
    difficulty: 'ADVANCED',
    amenities: { parking: true, shower: false },
  },
  {
    name: '부산 송정해변',
    description:
      '부산 최고의 서핑 해변. 도심과 가까워 접근성이 좋고, 꾸준한 파도가 들어옴. 사계절 서핑이 가능하며 서핑 문화가 활발한 곳.',
    latitude: 35.1783,
    longitude: 129.2003,
    address: '부산광역시 해운대구 송정해변로',
    region: '부산',
    difficulty: 'BEGINNER',
    amenities: { parking: true, shower: true, rental: true, lesson: true, cafe: true, restaurant: true },
  },
  {
    name: '제주 중문해변',
    description:
      '제주도 남쪽 중문관광단지 내 위치. 검은 모래와 강한 파도가 특징. 파워풀한 비치 브레이크로 중상급자에게 인기.',
    latitude: 33.2447,
    longitude: 126.4108,
    address: '제주특별자치도 서귀포시 중문관광로',
    region: '제주',
    difficulty: 'INTERMEDIATE',
    amenities: { parking: true, shower: true, rental: true, lesson: true },
  },
  {
    name: '제주 이호테우해변',
    description:
      '제주 시내에서 가장 가까운 서핑 해변. 말 등대로 유명하며 초보자도 편하게 서핑할 수 있는 부드러운 파도.',
    latitude: 33.4975,
    longitude: 126.4528,
    address: '제주특별자치도 제주시 이호일동',
    region: '제주',
    difficulty: 'BEGINNER',
    amenities: { parking: true, shower: true, rental: true, lesson: true },
  },
  {
    name: '고성 봉포해변',
    description:
      '강원도 북쪽의 한적한 서핑 포인트. 맑은 물과 좋은 파도 퀄리티로 로컬 서퍼들이 아끼는 곳. 스웰 방향에 따라 다양한 파도 경험 가능.',
    latitude: 38.2934,
    longitude: 128.5561,
    address: '강원도 고성군 죽왕면 봉포리',
    region: '고성',
    difficulty: 'INTERMEDIATE',
    amenities: { parking: true, shower: false, rental: false },
  },
  {
    name: '강릉 사천해변',
    description:
      '강릉 시내에서 접근이 쉬운 서핑 해변. 완만한 경사와 모래 바닥으로 초보자에게 안전하며, 서핑 커뮤니티가 활발.',
    latitude: 37.8128,
    longitude: 128.8815,
    address: '강원도 강릉시 사천면 사천해변길',
    region: '강릉',
    difficulty: 'BEGINNER',
    amenities: { parking: true, shower: true, rental: true, lesson: true },
  },

  // ============================================================
  // 발리 (Bali) - 8개
  // ============================================================
  {
    name: 'Kuta Beach',
    description:
      '발리 서핑의 시작점. 넓고 완만한 비치 브레이크로 초보자에게 최적. 서핑 스쿨이 해변을 따라 줄지어 있으며, 석양이 아름다운 곳.',
    latitude: -8.7185,
    longitude: 115.1686,
    address: 'Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'BEGINNER',
    amenities: { parking: true, shower: true, rental: true, lesson: true, cafe: true, restaurant: true },
  },
  {
    name: 'Uluwatu',
    description:
      '세계적으로 유명한 레프트 핸드 리프 브레이크. 절벽 아래 동굴을 통해 진입하며, 강력하고 긴 파도가 특징. 상급자 전용 포인트.',
    latitude: -8.8291,
    longitude: 115.0849,
    address: 'Pecatu, South Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'EXPERT',
    amenities: { parking: true, shower: false, cafe: true },
  },
  {
    name: 'Padang Padang',
    description:
      '영화 "먹고 기도하고 사랑하라"의 촬영지. 작은 해변이지만 완벽한 배럴 파도로 유명. 빅 스웰 시 세계적인 수준의 파도가 형성됨.',
    latitude: -8.8118,
    longitude: 115.0992,
    address: 'Pecatu, South Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'ADVANCED',
    amenities: { parking: true, shower: false, cafe: true },
  },
  {
    name: 'Canggu - Batu Bolong',
    description:
      '짱구 지역의 대표 서핑 포인트. 비치 브레이크와 리프 브레이크가 혼합되어 다양한 레벨의 서퍼가 즐길 수 있음. 힙한 카페와 바가 즐비.',
    latitude: -8.6478,
    longitude: 115.1322,
    address: 'Canggu, North Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'INTERMEDIATE',
    amenities: { parking: true, shower: true, rental: true, lesson: true, cafe: true, restaurant: true },
  },
  {
    name: 'Echo Beach',
    description:
      '짱구 에코비치. 파워풀한 비치 브레이크로 중급 이상 서퍼에게 적합. 석양과 함께 서핑하는 분위기가 최고인 곳.',
    latitude: -8.6521,
    longitude: 115.1189,
    address: 'Canggu, North Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'INTERMEDIATE',
    amenities: { parking: true, shower: true, rental: true, cafe: true },
  },
  {
    name: 'Seminyak Beach',
    description:
      '발리 서쪽 해안의 세미냑 비치. 쿠타보다 조용하고 파도도 비슷하게 완만하여 초중급자에게 적합. 고급 리조트와 레스토랑이 인접.',
    latitude: -8.6903,
    longitude: 115.1550,
    address: 'Seminyak, North Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'BEGINNER',
    amenities: { parking: true, shower: true, rental: true, lesson: true, cafe: true },
  },
  {
    name: 'Balangan Beach',
    description:
      '울루와뚜 반도 서쪽의 아름다운 해변. 레프트 핸드 리프 브레이크로 중급 이상 서퍼에게 좋은 파도를 제공. 절벽 위에서 서핑 뷰포인트가 매력적.',
    latitude: -8.7900,
    longitude: 115.1117,
    address: 'Jimbaran, South Kuta, Badung Regency, Bali',
    region: 'Bali',
    difficulty: 'INTERMEDIATE',
    amenities: { parking: true, shower: false, cafe: true },
  },
  {
    name: 'Keramas Beach',
    description:
      '발리 동쪽 해안의 월드클래스 라이트 핸드 리프 브레이크. WSL 대회가 열리는 곳으로 파워풀하고 빠른 파도가 특징. 상급자 전용.',
    latitude: -8.5753,
    longitude: 115.4572,
    address: 'Medahan, Blahbatuh, Gianyar Regency, Bali',
    region: 'Bali',
    difficulty: 'EXPERT',
    amenities: { parking: true, shower: false, cafe: true },
  },
];

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
    console.log('Database connected\n');

    let insertCount = 0;
    let skipCount = 0;

    for (const spot of spots) {
      // name 기준 중복 체크
      const check = await client.query(
        'SELECT id FROM spots WHERE name = $1',
        [spot.name],
      );

      if (check.rows.length > 0) {
        console.log(`  SKIP: ${spot.name} (already exists)`);
        skipCount++;
        continue;
      }

      await client.query(
        `INSERT INTO spots (id, name, description, latitude, longitude, address, region, difficulty, amenities, is_active, rating, rating_count, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, true, 0, 0, NOW(), NOW())`,
        [
          spot.name,
          spot.description,
          spot.latitude,
          spot.longitude,
          spot.address,
          spot.region,
          spot.difficulty,
          JSON.stringify(spot.amenities),
        ],
      );
      console.log(`  INSERT: ${spot.name}`);
      insertCount++;
    }

    console.log(`\nSeed completed: ${insertCount} inserted, ${skipCount} skipped`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
