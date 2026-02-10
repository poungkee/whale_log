# Day 2: JWT 인증 전환 및 React 프론트엔드 앱 구축

> **작업일**: 2026-02-09 (일)
> **커밋 이력**:
> - `61aa63d` feat: React 프론트엔드 앱 구축 + 백엔드 mock auth 수정
> - `a4a1aaf` chore: .gitignore에 surf-wave-design/ 참고 자료 폴더 제외
> - **미커밋**: JWT 인증 전환 + 프론트엔드 실제 API 연동 + 보안 수정 (25파일, +1,501줄, -405줄)

---

## 1. 작업 개요

Day 2의 핵심 목표는 **Firebase 기반 인증을 자체 JWT + bcrypt 인증으로 완전 전환**하고, **React 프론트엔드 앱을 구축하여 백엔드 API와 실제 연동**하는 것이었습니다.

### 작업 범위
- Firebase Auth → JWT + bcrypt 자체 인증 완전 마이그레이션
- Google/Kakao OAuth2 소셜 로그인 백엔드 API 구현
- React 18 + Vite + TypeScript + Tailwind CSS 4 프론트엔드 앱 구축
- 회원가입 → 레벨 선택 → 메인 대시보드 전체 흐름 연동
- 보안 수정 (passwordHash 응답 노출 제거)
- 전체 E2E 검증 통과

---

## 2. 인증 시스템 전환

### 2.1 변경 전 (Day 1 — Firebase 기반)

```
클라이언트 (Firebase SDK)
    ↓
Firebase Authentication 서버
    ↓ Firebase ID Token
백엔드 (Firebase Admin SDK로 토큰 검증)
    ↓ Firebase UID 추출
User DB에 firebaseUid로 저장
```

**문제점:**
- Firebase SDK 의존성 무거움
- 클라이언트에서 Firebase 초기화 필요
- 소셜 로그인도 Firebase 경유 필수
- 자체 서버에서 사용자 관리 제한적

### 2.2 변경 후 (Day 2 — JWT 자체 인증)

```
클라이언트
    ├─ 일반: 이메일 + 비밀번호
    ├─ Google: Google ID 토큰
    └─ Kakao: Kakao 액세스 토큰
    ↓
백엔드 (자체 검증)
    ├─ 일반: bcrypt.compare(비밀번호, passwordHash)
    ├─ Google: GET https://oauth2.googleapis.com/tokeninfo
    └─ Kakao: GET https://kapi.kakao.com/v2/user/me
    ↓
자체 JWT 발급 { sub: userId, email, role }
    ↓
클라이언트 (localStorage에 저장)
    ↓
API 요청 시 Authorization: Bearer {JWT}
    ↓
백엔드 (FirebaseAuthGuard에서 JWT 검증)
    ↓
request.user = { sub, email, role }
```

### 2.3 JWT 설정

| 항목 | 값 |
|------|---|
| 알고리즘 | HS256 |
| Secret | 환경변수 `JWT_SECRET` (기본값: `surfwave-jwt-secret-dev-2026`) |
| 만료 시간 | 7일 (`7d`) |
| Payload | `{ sub: UUID, email: string, role: 'USER'|'ADMIN' }` |
| 비밀번호 해싱 | bcrypt (salt rounds: 10) |

---

## 3. 백엔드 상세 변경

### 3.1 auth.service.ts — 인증 서비스 (완전 재작성)

**제거된 의존성:**
```typescript
// 삭제: @Inject(FIREBASE_ADMIN) private firebaseAdmin
```

**추가된 의존성:**
```typescript
private jwtService: JwtService      // JWT 토큰 생성/검증
private httpService: HttpService    // Google/Kakao API 호출
```

**구현된 메서드 (7개):**

| 메서드 | 기능 | 접근 |
|--------|------|------|
| `register(dto)` | 이메일/비밀번호 회원가입 | Public |
| `login(dto)` | 이메일/비밀번호 로그인 | Public |
| `googleLogin(dto)` | Google OAuth2 로그인 | Public |
| `kakaoLogin(dto)` | Kakao OAuth2 로그인 | Public |
| `withdraw(userId)` | 회원탈퇴 (소프트 삭제) | JWT 필요 |
| `generateToken(user)` | JWT 토큰 생성 (private) | 내부용 |
| `sanitizeUser(user)` | 민감 정보 제거 (private) | 내부용 |

#### register (회원가입) 상세 흐름:
```
1. 이메일 중복 확인 → 409 "이미 가입된 이메일입니다"
2. 닉네임 중복 확인 → 409 "이미 사용 중인 닉네임입니다"
3. bcrypt.hash(password, 10) → passwordHash 생성
4. User 레코드 생성 (passwordHash 저장, firebaseUid: null)
5. JWT 토큰 발급
6. { accessToken, user: sanitizeUser(user) } 반환
```

#### login (로그인) 상세 흐름:
```
1. 이메일로 사용자 조회 → 401 "가입되지 않은 이메일입니다"
2. passwordHash 존재 확인 → 401 "소셜 로그인으로 가입된 계정입니다"
3. bcrypt.compare(입력, passwordHash) → 401 "비밀번호가 일치하지 않습니다"
4. isSuspended 확인 → 401 "정지된 계정입니다"
5. lastLoginAt 갱신
6. JWT 토큰 발급
7. { accessToken, user: sanitizeUser(user) } 반환
```

#### socialLogin (소셜 로그인 공통) 상세 흐름:
```
1. socialId("google_xxx" | "kakao_yyy")로 기존 사용자 조회
2. 없으면 → 이메일로 기존 계정 확인
3. 기존 이메일 계정 있으면 → firebaseUid 업데이트 (계정 연결)
4. 완전 신규 → 사용자 자동 생성 (닉네임: "이메일앞부분_랜덤4자리")
5. JWT 토큰 발급
```

#### googleLogin 상세:
```
1. Google tokeninfo API 호출
   GET https://oauth2.googleapis.com/tokeninfo?id_token={credential}
2. 응답에서 sub(Google ID) + email 추출
3. socialId = "google_{sub}"
4. socialLogin(socialId, email, 'GOOGLE') 호출
```

#### kakaoLogin 상세:
```
1. Kakao user/me API 호출
   GET https://kapi.kakao.com/v2/user/me
   Header: Authorization: Bearer {accessToken}
2. 응답에서 id + kakao_account.email 추출
3. 이메일 없으면 → 401 "카카오 계정에 이메일이 없습니다"
4. socialId = "kakao_{id}"
5. socialLogin(socialId, email, 'KAKAO') 호출
```

### 3.2 auth.controller.ts — API 엔드포인트 (완전 재작성)

| 메서드 | 엔드포인트 | 인증 | 설명 |
|--------|-----------|------|------|
| POST | `/api/v1/auth/register` | @Public | 이메일/비밀번호 회원가입 |
| POST | `/api/v1/auth/login` | @Public | 이메일/비밀번호 로그인 |
| POST | `/api/v1/auth/google` | @Public | Google 소셜 로그인 |
| POST | `/api/v1/auth/kakao` | @Public | Kakao 소셜 로그인 |
| DELETE | `/api/v1/auth/withdraw` | JWT 필요 | 회원탈퇴 |

### 3.3 firebase-auth.guard.ts — JWT 검증 가드 (재작성)

```typescript
동작 흐름:
1. @Public() 데코레이터 확인 → 있으면 인증 스킵
2. Authorization 헤더에서 "Bearer {token}" 추출
3. JwtService.verifyAsync(token, { secret }) 검증
4. request.user = JWT payload 저장
5. 실패 시 → 401 Unauthorized

적용 범위: APP_GUARD로 모든 엔드포인트에 자동 적용
```

### 3.4 auth.module.ts — 모듈 설정 변경

```typescript
// 변경 전 (Firebase 기반)
imports: [UsersModule]
providers: [FirebaseProvider, AuthService]
exports: [AuthService, FirebaseProvider]

// 변경 후 (JWT 기반)
imports: [
  UsersModule,
  HttpModule,                    // Google/Kakao API 호출용
  JwtModule.registerAsync({      // JWT 토큰 생성/검증
    secret: JWT_SECRET,
    signOptions: { expiresIn: '7d' },
  }),
]
providers: [AuthService]
exports: [AuthService, JwtModule]  // JwtModule 내보내기 (글로벌 가드용)
```

### 3.5 app.module.ts — 글로벌 가드 등록

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: FirebaseAuthGuard,  // 모든 요청에 JWT 검증 자동 적용
  },
]
```

### 3.6 current-user.decorator.ts — JWT payload 매핑

```typescript
// 변경 전: RequestUser { uid, email, role }
// 변경 후: RequestUser { id, email, role }

// JWT의 sub → id로 매핑
const user: RequestUser = {
  id: jwtPayload.sub,    // UUID
  email: jwtPayload.email,
  role: jwtPayload.role,
};
```

### 3.7 users.service.ts — 보안 수정

**새로 추가된 메서드: `sanitizeUser(user)`**
```typescript
// 민감 정보 제거 후 안전한 데이터만 반환
반환 필드: id, email, nickname, bio, avatarUrl, role,
          surfLevel, provider, notificationsEnabled,
          createdAt, updatedAt

제거 필드: passwordHash, fcmToken, firebaseUid,
          isSuspended, suspendedUntil, deletedAt
```

### 3.8 users.controller.ts — 응답 보안 적용

```typescript
// 변경 전: User 엔티티 전체 반환 (passwordHash 포함!)
return this.usersService.findById(user.id);

// 변경 후: sanitizeUser()로 민감 정보 제거
const fullUser = await this.usersService.findById(user.id);
return this.usersService.sanitizeUser(fullUser);
```

- `GET /users/me` — sanitizeUser 적용
- `PATCH /users/me` — sanitizeUser 적용

### 3.9 update-profile.dto.ts — 레벨 검증 강화

```typescript
// 변경 전: @IsString() surfLevel
// 변경 후: @IsEnum(Difficulty) surfLevel
// 에러 메시지: "서핑 레벨은 BEGINNER, INTERMEDIATE, ADVANCED, EXPERT 중 하나여야 합니다"
```

### 3.10 spots.controller.ts — uid → id 변경

```typescript
// 변경 전: user.uid (8곳)
// 변경 후: user.id (8곳)
// 이유: CurrentUser 데코레이터의 RequestUser.uid → RequestUser.id 변경에 따른 수정
```

### 3.11 DTO 한국어 유효성 메시지

**register.dto.ts:**
```
email: "올바른 이메일 형식이 아닙니다", "이메일을 입력해주세요"
password: "비밀번호를 입력해주세요", "비밀번호는 6자 이상이어야 합니다"
nickname: "닉네임을 입력해주세요", "닉네임은 2자 이상이어야 합니다", "닉네임은 30자 이하여야 합니다"
```

**login.dto.ts:**
```
email: "올바른 이메일 형식이 아닙니다", "이메일을 입력해주세요"
password: "비밀번호를 입력해주세요"
```

---

## 4. 프론트엔드 앱 구축

### 4.1 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18 | UI 프레임워크 |
| TypeScript | 5.x | 타입 안전성 |
| Vite | 6.4 | 빌드 도구 + 개발 서버 |
| Tailwind CSS | 4 | 스타일링 |
| Lucide React | - | 아이콘 |

### 4.2 프로젝트 구조

```
surf-wave-frontend/
├── src/
│   ├── App.tsx              ← 루트: 화면 전환 + 인증 상태 관리
│   ├── main.tsx             ← React 마운트
│   ├── pages/
│   │   ├── Welcome.tsx      ← 시작 화면 (앱 소개 + 로그인/회원가입 버튼)
│   │   ├── Login.tsx        ← 로그인 (이메일/비밀번호 + 소셜 버튼)
│   │   ├── Register.tsx     ← 회원가입 (닉네임/이메일/비밀번호)
│   │   ├── LevelSelect.tsx  ← 레벨 선택 (온보딩)
│   │   ├── Home.tsx         ← 메인 대시보드 (예보 카드)
│   │   └── MyPage.tsx       ← 마이페이지 (프로필/설정/로그아웃)
│   ├── components/
│   │   ├── BottomNav.tsx    ← 하단 네비게이션 (홈/지도/피드/마이)
│   │   └── SpotCard.tsx     ← 스팟 예보 카드 컴포넌트
│   └── types/
│       └── index.ts         ← 전역 타입 정의
├── vite.config.ts           ← API 프록시: /api → localhost:3000
└── package.json
```

### 4.3 화면 전환 흐름

```
splash (2초, 자동 전환)
  ↓
  ├─ 토큰 + 레벨 있음 → main (메인 화면)
  ├─ 토큰만 있음 → level-select (레벨 선택)
  └─ 토큰 없음 → welcome (시작 화면)

welcome
  ├─ "로그인" → login
  └─ "회원가입" → register

login → 성공
  ├─ surfLevel 있음 → main
  └─ surfLevel 없음 → level-select

register → 성공
  └─ surfLevel: null → level-select

level-select → 레벨 선택 완료
  └─ 서버 저장 (PATCH /users/me) → main

main (탭: home | map | feed | mypage)
  └─ mypage → 로그아웃 → welcome
```

### 4.4 인증 데이터 관리 (localStorage)

| 키 | 값 | 용도 |
|---|---|------|
| `accessToken` | JWT 문자열 | API Authorization 헤더 |
| `user` | UserInfo JSON | 닉네임, 이메일 표시 |
| `surfLevel` | "BEGINNER" 등 | 대시보드 필터 |

**저장 시점**: 로그인/회원가입 성공 시
**삭제 시점**: 로그아웃 시 (전체 초기화)
**복원 시점**: 앱 시작 시 (splash에서 확인)

### 4.5 주요 페이지 상세

#### App.tsx — 루트 컴포넌트

```typescript
상태:
- screen: AppScreen (현재 화면)
- mainTab: MainTab (하단 탭)
- surfLevel: SurfLevel | null
- userInfo: UserInfo | null

핵심 함수:
- handleAuthSuccess(authData) → 토큰 저장 + 화면 전환
- handleLevelSelect(level) → 서버 저장 + 메인 이동
- handleLevelChange(level) → 서버 업데이트
- handleLogout() → localStorage 초기화 + welcome 이동
```

#### Login.tsx — 로그인 화면

```
UI 구성:
- 로고 + "환영합니다!" 타이틀
- 이메일 입력 (Mail 아이콘)
- 비밀번호 입력 (Lock 아이콘 + 눈 토글)
- 로그인 상태 유지 체크박스
- 비밀번호 찾기 링크
- [로그인] 버튼
- "또는" 구분선
- [Google로 계속하기] 버튼 (UI만, 기능 미구현)
- [카카오로 계속하기] 버튼 (UI만, 기능 미구현)
- 회원가입 링크

API: POST /api/v1/auth/login { email, password }
응답: { accessToken, user: UserInfo }
```

#### Register.tsx — 회원가입 화면

```
UI 구성:
- 로고 + "회원가입" 타이틀
- 닉네임 입력 (User 아이콘)
- 이메일 입력 (Mail 아이콘)
- 비밀번호 입력 (Lock 아이콘)
- 비밀번호 확인 입력
- [회원가입] 버튼
- 로그인 링크

클라이언트 유효성 검증:
- 닉네임: 2자 이상
- 이메일: @ 포함
- 비밀번호: 6자 이상
- 비밀번호 확인: 일치

API: POST /api/v1/auth/register { email, password, nickname }
에러: 409 "이미 가입된 이메일입니다" / "이미 사용 중인 닉네임입니다"
```

#### Home.tsx — 메인 대시보드

```
API: GET /api/v1/dashboard/forecasts?level={surfLevel}
응답: DashboardResponse { fetchedAt, totalSpots, spots[] }

UI 구성:
- 헤더: 앱 로고 + "초급 모드" + 새로고침/검색
- 오늘의 추천: surfRating 최고 스팟 하이라이트
- 스팟 목록: SpotCard 컴포넌트 반복
- 로딩 스켈레톤 / 에러 / 빈 상태 처리

자동 갱신: surfLevel 변경 시 useEffect로 재조회
```

#### SpotCard.tsx — 스팟 카드 컴포넌트

```
표시 정보:
- spot.name (스팟 이름) + spot.region (지역)
- spot.difficulty → 한국어 배지 (초보자 적합 / 중급자 추천 / 상급자 추천 / 전문가 전용)
- surfRating (1~5) + 이모지 (🤙👍🤔😴)
- recommendationKo (한국어 추천 문구)
- forecast.waveHeight (파고) + forecast.wavePeriod (주기)
- forecast.windSpeed (풍속)
- simpleCondition.overall (좋음/보통/주의 배지)

색상 코딩:
- rating 4~5: 녹색 (#32CD32)
- rating 3: 파란색 (#008CBA)
- rating 2: 주황색 (#FF8C00)
- rating 1: 빨간색 (#FF4444)
```

#### MyPage.tsx — 마이페이지

```
표시 정보:
- 프로필 아바타 (기본 서퍼 이모지)
- userInfo.nickname (닉네임)
- userInfo.email (이메일)
- surfLevel 색상 배지
- 레벨 변경 드롭다운 (4단계)
- 알림 설정 토글
- 앱 정보 (v1.0.0)
- 로그아웃 버튼
```

### 4.6 전역 타입 정의 (types/index.ts)

```typescript
// 기본 타입
SurfLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
AppScreen = 'splash' | 'welcome' | 'login' | 'register' | 'level-select' | 'main'
MainTab = 'home' | 'map' | 'feed' | 'mypage'

// 인증 응답 (로그인/회원가입 API 반환값)
AuthResponse { accessToken: string, user: UserInfo }

// 사용자 정보 (민감 정보 제거됨)
UserInfo { id, email, nickname, avatarUrl, role, surfLevel, provider, notificationsEnabled }

// 대시보드 API 전체 응답
DashboardResponse { fetchedAt, totalSpots, spots: SpotForecast[] }

// 스팟별 예보 데이터 (실제 API 응답 구조 반영)
SpotForecast {
  spot: { id, name, description, latitude, longitude, region, difficulty }
  forecast: { waveHeight, wavePeriod, windSpeed, ... } | null
  surfRating: number
  recommendationKo: string
  simpleCondition: { waveStatus, windStatus, overall }
}
```

### 4.7 Vite 프록시 설정

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

- 프론트엔드 `http://localhost:5173`
- 백엔드 `http://localhost:3000`
- `/api/*` 요청 자동 프록시 → CORS 문제 없음

---

## 5. 보안 수정사항

### 5.1 passwordHash 응답 노출 제거

**문제**: `GET /users/me`와 `PATCH /users/me` 응답에 `passwordHash` 필드가 포함되어 있었음

**수정**:
- `UsersService.sanitizeUser()` 메서드 추가
- `UsersController`의 getMyProfile, updateMyProfile에서 sanitizeUser() 적용
- 인증 API(register/login)는 이미 AuthService.sanitizeUser()로 처리됨

### 5.2 전역 JWT 가드

- `APP_GUARD`로 모든 엔드포인트에 자동 적용
- `@Public()` 데코레이터 없으면 JWT 인증 필수
- 토큰 없는 요청 → 401 "인증 헤더가 없거나 형식이 올바르지 않습니다"
- 만료/위변조 토큰 → 401 "유효하지 않거나 만료된 토큰입니다"

---

## 6. E2E 검증 결과

### 6.1 전체 흐름 테스트 (Vite 프록시 경유)

| 단계 | 테스트 | API | 결과 |
|------|--------|-----|------|
| 1 | 회원가입 | POST /auth/register | `surfLevel: null` 반환 |
| 2 | 레벨 선택 저장 | PATCH /users/me | `surfLevel: "INTERMEDIATE"` 저장, passwordHash 미노출 |
| 3 | 대시보드 조회 | GET /dashboard/forecasts?level=INTERMEDIATE | 15개 스팟 반환 |
| 4 | 로그인 (기존 계정) | POST /auth/login | `surfLevel: "INTERMEDIATE"` 유지 |
| 5 | 레벨 변경 | PATCH /users/me | `surfLevel: "ADVANCED"` 변경 |
| 6 | 회원탈퇴 | DELETE /auth/withdraw | "회원탈퇴가 완료되었습니다" |

### 6.2 에러 케이스 테스트

| 테스트 | 기대 결과 | 실제 결과 |
|--------|----------|----------|
| 중복 이메일 가입 | 409 | `"이미 가입된 이메일입니다"` |
| 잘못된 비밀번호 | 401 | `"비밀번호가 일치하지 않습니다"` |
| 잘못된 레벨값 | 400 | `"서핑 레벨은 BEGINNER, ... 중 하나여야 합니다"` |
| 토큰 없이 보호 API | 401 | `"인증 헤더가 없거나 형식이 올바르지 않습니다"` |

### 6.3 빌드 검증

| 항목 | 결과 |
|------|------|
| 백엔드 `tsc --noEmit` | 에러 0건 |
| 프론트엔드 `tsc --noEmit` | 에러 0건 |
| 프론트엔드 `npm run build` | 성공 (186KB JS, 29KB CSS) |

---

## 7. 에러 메시지 체계 (전체 한국어화)

### 7.1 회원가입

| 상태코드 | 메시지 |
|---------|--------|
| 409 | "이미 가입된 이메일입니다" |
| 409 | "이미 사용 중인 닉네임입니다" |
| 400 | "올바른 이메일 형식이 아닙니다" |
| 400 | "비밀번호는 6자 이상이어야 합니다" |
| 400 | "닉네임은 2자 이상이어야 합니다" |

### 7.2 로그인

| 상태코드 | 메시지 |
|---------|--------|
| 401 | "가입되지 않은 이메일입니다" |
| 401 | "비밀번호가 일치하지 않습니다" |
| 401 | "소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요." |
| 401 | "정지된 계정입니다" |

### 7.3 소셜 로그인

| 상태코드 | 메시지 |
|---------|--------|
| 401 | "Google 인증에 실패했습니다" |
| 401 | "카카오 인증에 실패했습니다" |
| 401 | "카카오 계정에 이메일이 없습니다. 이메일 제공에 동의해주세요." |

### 7.4 인증/프로필

| 상태코드 | 메시지 |
|---------|--------|
| 401 | "인증 헤더가 없거나 형식이 올바르지 않습니다" |
| 401 | "유효하지 않거나 만료된 토큰입니다" |
| 400 | "서핑 레벨은 BEGINNER, INTERMEDIATE, ADVANCED, EXPERT 중 하나여야 합니다" |

---

## 8. 수정 파일 전체 목록

### 8.1 백엔드 (15파일)

| 파일 | 작업 | 설명 |
|------|------|------|
| `app.module.ts` | 수정 | APP_GUARD 등록 (전역 JWT 검증) |
| `common/guards/firebase-auth.guard.ts` | 재작성 | Firebase → JWT 검증으로 전환 |
| `common/decorators/current-user.decorator.ts` | 재작성 | uid → id 매핑 (JWT sub → id) |
| `modules/auth/auth.module.ts` | 재작성 | JwtModule + HttpModule 설정 |
| `modules/auth/auth.service.ts` | 재작성 | JWT 인증 + bcrypt + 소셜 로그인 |
| `modules/auth/auth.controller.ts` | 재작성 | 5개 API 엔드포인트 |
| `modules/auth/dto/register.dto.ts` | 재작성 | 한국어 유효성 메시지 |
| `modules/auth/dto/login.dto.ts` | 재작성 | 한국어 유효성 메시지 |
| `modules/users/users.service.ts` | 수정 | sanitizeUser() 추가 |
| `modules/users/users.controller.ts` | 재작성 | sanitizeUser 적용 + RequestUser 타입 |
| `modules/users/dto/update-profile.dto.ts` | 수정 | @IsEnum(Difficulty) 추가 |
| `modules/users/entities/user.entity.ts` | 수정 | passwordHash 컬럼 추가, firebaseUid nullable |
| `modules/spots/spots.controller.ts` | 수정 | user.uid → user.id (8곳) |
| `package.json` | 수정 | bcrypt, @nestjs/jwt 의존성 추가 |
| `package-lock.json` | 자동 | 의존성 잠금 파일 |

### 8.2 프론트엔드 (10파일)

| 파일 | 작업 | 설명 |
|------|------|------|
| `App.tsx` | 재작성 | 화면 전환 + JWT 토큰 관리 + 레벨 저장 |
| `pages/Login.tsx` | 재작성 | 실제 API 연동 + 에러 처리 |
| `pages/Register.tsx` | 재작성 | 실제 API 연동 + 클라이언트 유효성 검증 |
| `pages/Home.tsx` | 수정 | DashboardResponse 타입 + json.spots 파싱 |
| `pages/MyPage.tsx` | 수정 | userInfo prop 추가 + 닉네임/이메일 표시 |
| `pages/Welcome.tsx` | 수정 | 한국어 주석 추가 |
| `pages/LevelSelect.tsx` | 수정 | 한국어 주석 추가 |
| `components/SpotCard.tsx` | 수정 | 새 SpotForecast 타입 적용 |
| `components/BottomNav.tsx` | 수정 | 한국어 주석 추가 |
| `types/index.ts` | 재작성 | AuthResponse, UserInfo, DashboardResponse, SpotForecast |

---

## 9. 소셜 로그인 프론트엔드 연동 (Google + Kakao)

> **작업일**: 2026-02-10 (월)

### 9.1 Google 소셜 로그인

**SDK**: Google Identity Services (GIS) v1 — `index.html`에서 `<script async defer>` 로드

**흐름**:
```
1. Login.tsx useEffect → google.accounts.id.initialize(clientId, callback)
2. google.accounts.id.renderButton() → 숨겨진 div에 공식 버튼 렌더링
3. 커스텀 "Google로 계속하기" 버튼 클릭 → 숨겨진 Google 버튼 click() 전달
4. 사용자 Google 로그인 → credential (ID 토큰) 수신
5. POST /api/v1/auth/google { credential } → JWT 발급
6. handleAuthSuccess() → 토큰 저장 + 화면 전환
```

**환경변수**: `VITE_GOOGLE_CLIENT_ID` (프론트엔드)

**타입 선언**: `global.d.ts` — `GoogleCredentialResponse`, `GoogleAccountsId`, `google.accounts.id`

### 9.2 Kakao 소셜 로그인

**SDK**: Kakao JavaScript SDK v2.7.4 — `index.html`에서 `<script async>` 로드

**흐름 (인가코드 방식 — REST API 키 직접 리다이렉트)**:
```
1. Login.tsx handleKakaoLogin()
   → window.location.href = "https://kauth.kakao.com/oauth/authorize
      ?client_id={REST_API_KEY}&redirect_uri=...&response_type=code"
2. 사용자 Kakao 로그인 + 동의 → redirectUri로 ?code=xxx 리다이렉트
3. App.tsx useEffect → pathname '/auth/kakao/callback' + code 감지
4. POST /api/v1/auth/kakao/callback { code, redirectUri }
5. 백엔드: Kakao token API (code → access_token) → user/me API → JWT 발급
6. handleAuthSuccess() → 토큰 저장 + 화면 전환
```

**환경변수**:
- `VITE_KAKAO_JS_KEY` (프론트엔드 — SDK 초기화용, 현재 미사용)
- `VITE_KAKAO_REST_API_KEY` (프론트엔드 — authorize 리다이렉트 client_id)
- `KAKAO_REST_API_KEY` (백엔드 — 토큰 교환 client_id)
- `KAKAO_CLIENT_SECRET` (백엔드 — 선택, 카카오 콘솔에서 활성화 시 필수)

**타입 선언**: `global.d.ts` — `KakaoSDK`, `Kakao`

### 9.3 디버깅 과정에서 해결한 이슈

| 이슈 | 원인 | 해결 |
|------|------|------|
| Google 로그인 초기화 실패 | Kakao SDK `<script>` 동기 로드가 Google SDK 로드 차단 | Kakao script에 `async` 속성 추가 |
| Kakao `KOE010` Bad client credentials | `Kakao.Auth.authorize()`는 JS Key로 인가코드 발급, 백엔드는 REST API Key로 토큰 교환 → 키 불일치 | 프론트엔드에서 SDK 대신 REST API Key로 직접 authorize URL 리다이렉트 |
| Kakao 이메일 미제공 | 카카오 비즈앱 미전환 시 이메일 동의항목 필수 설정 불가 | 이메일 없을 시 `kakao_{id}@kakao.user` 자동 생성 |

### 9.4 소셜 로그인 DB 저장 구조

| 필드 | Google | Kakao | 이메일 가입 |
|------|--------|-------|------------|
| `provider` | `'GOOGLE'` | `'KAKAO'` | `null` |
| `firebase_uid` | `google_{sub}` | `kakao_{id}` | `null` |
| `email` | Google 이메일 | 카카오 이메일 또는 `kakao_{id}@kakao.user` | 입력 이메일 |
| `password_hash` | `null` | `null` | bcrypt 해시 |

### 9.5 추가/수정된 파일

| 파일 | 작업 | 설명 |
|------|------|------|
| `frontend/index.html` | 수정 | Google GIS + Kakao SDK script 태그 추가 |
| `frontend/src/pages/Login.tsx` | 수정 | Google GIS 초기화 + Kakao REST API 리다이렉트 |
| `frontend/src/App.tsx` | 수정 | Kakao 인가코드 콜백 처리 (useEffect) |
| `frontend/src/types/global.d.ts` | 신규 | Google GIS + Kakao SDK TypeScript 타입 선언 |
| `frontend/.env` | 수정 | VITE_GOOGLE_CLIENT_ID, VITE_KAKAO_JS_KEY, VITE_KAKAO_REST_API_KEY |
| `backend/src/modules/auth/dto/social-login.dto.ts` | 신규 | Google/Kakao 소셜 로그인 DTO (유효성 검증) |
| `backend/src/modules/auth/auth.service.ts` | 수정 | kakaoLoginWithCode() 메서드 추가 (인가코드 → 토큰 교환) |
| `backend/src/modules/auth/auth.controller.ts` | 수정 | POST /auth/kakao/callback 엔드포인트 추가 |
| `backend/.env` | 수정 | KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET 추가 |

---

## 10. 남은 작업

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| — | 현재 없음 | — | 핵심 3기능 (계정/스팟/예보) 모두 완료 |
