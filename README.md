# Surf Wave Forecast App - Skeleton Plan

## 확정된 기술 스택

| 항목 | 선택 |
|------|------|
| 모바일 | React Native + TypeScript |
| 백엔드 | NestJS + TypeScript |
| DB | PostgreSQL + TypeORM |
| 인증 | Firebase Auth |
| API | REST API (v1) |
| 이미지 | AWS S3 |
| 상태관리 | Zustand + TanStack Query |
| 캐싱 | Redis |
| 레포 구조 | 멀티레포 (프론트/백엔드/공유타입 3개) |

---

## 1. 레포 구성 (3개 멀티레포)

### 1-1. `surf-wave-backend/` (NestJS)

```
surf-wave-backend/
├── .env.example
├── docker-compose.yml            # PostgreSQL + Redis (로컬 개발)
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── config.module.ts
│   │   ├── database.config.ts    # TypeORM 연결
│   │   ├── redis.config.ts
│   │   ├── firebase.config.ts    # Firebase Admin SDK
│   │   ├── aws.config.ts         # S3
│   │   └── swagger.config.ts
│   ├── common/
│   │   ├── constants/
│   │   │   ├── error-codes.ts
│   │   │   └── app.constants.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── paginated-response.dto.ts
│   │   ├── entities/
│   │   │   └── base.entity.ts        # id, createdAt, updatedAt, deletedAt
│   │   ├── enums/                    # 모든 enum 정의
│   │   │   ├── role.enum.ts
│   │   │   ├── difficulty.enum.ts
│   │   │   ├── board-type.enum.ts
│   │   │   ├── report-reason.enum.ts
│   │   │   ├── report-status.enum.ts
│   │   │   ├── notification-type.enum.ts
│   │   │   ├── tide-status.enum.ts
│   │   │   ├── wind-direction.enum.ts
│   │   │   ├── vote-type.enum.ts
│   │   │   ├── visibility.enum.ts
│   │   │   ├── guide-category.enum.ts
│   │   │   └── social-provider.enum.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── typeorm-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── firebase-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   └── utils/
│   │       ├── geo.util.ts
│   │       └── date.util.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── dto/
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/user.entity.ts
│   │   │   └── dto/
│   │   ├── spots/
│   │   │   ├── spots.module.ts
│   │   │   ├── spots.controller.ts
│   │   │   ├── spots.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── spot.entity.ts
│   │   │   │   ├── spot-favorite.entity.ts
│   │   │   │   └── spot-vote.entity.ts
│   │   │   └── dto/
│   │   ├── forecasts/
│   │   │   ├── forecasts.module.ts
│   │   │   ├── forecasts.controller.ts
│   │   │   ├── forecasts.service.ts
│   │   │   ├── entities/forecast.entity.ts
│   │   │   ├── dto/
│   │   │   └── providers/
│   │   │       ├── forecast-provider.interface.ts
│   │   │       └── open-meteo.provider.ts
│   │   ├── diary/
│   │   │   ├── diary.module.ts
│   │   │   ├── diary.controller.ts
│   │   │   ├── diary.service.ts
│   │   │   ├── entities/
│   │   │   │   ├── surf-diary.entity.ts
│   │   │   │   └── diary-image.entity.ts
│   │   │   └── dto/
│   │   ├── community/
│   │   │   ├── community.module.ts
│   │   │   ├── posts/
│   │   │   │   ├── posts.controller.ts
│   │   │   │   ├── posts.service.ts
│   │   │   │   └── entities/ (post.entity, post-image.entity)
│   │   │   ├── comments/
│   │   │   │   ├── comments.controller.ts
│   │   │   │   ├── comments.service.ts
│   │   │   │   └── entities/comment.entity.ts
│   │   │   ├── likes/
│   │   │   ├── bookmarks/
│   │   │   └── reports/
│   │   ├── qna/
│   │   │   ├── qna.module.ts
│   │   │   ├── questions/ (controller, service, entities, dto)
│   │   │   └── answers/ (controller, service, entities, dto)
│   │   ├── guides/
│   │   │   ├── guides.module.ts
│   │   │   ├── guides.controller.ts
│   │   │   ├── guides.service.ts
│   │   │   └── entities/ (guide.entity, guide-progress.entity)
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── entities/ (notification.entity, condition-alert.entity)
│   │   │   └── providers/fcm.provider.ts
│   │   ├── upload/
│   │   │   ├── upload.module.ts
│   │   │   ├── upload.controller.ts
│   │   │   └── upload.service.ts
│   │   ├── terms/
│   │   │   ├── terms.module.ts
│   │   │   └── entities/ (terms.entity, terms-agreement.entity)
│   │   └── admin/
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts
│   │       └── admin.service.ts
│   └── database/
│       ├── migrations/
│       ├── seeds/ (spot.seed.ts, guide.seed.ts)
│       └── data-source.ts
```

### 1-2. `surf-wave-mobile/` (React Native)

```
surf-wave-mobile/
├── package.json
├── tsconfig.json
├── app.json
├── babel.config.js
├── metro.config.js
├── ios/
├── android/
├── src/
│   ├── App.tsx                       # 프로바이더, 네비게이션 컨테이너
│   ├── config/
│   │   ├── env.ts                    # API_URL 등
│   │   ├── firebase.ts
│   │   ├── queryClient.ts           # TanStack Query 설정
│   │   └── api.ts                   # Axios 인스턴스 (인터셉터)
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # 인증 분기 -> AuthStack / MainTab
│   │   ├── AuthStack.tsx            # Welcome -> Login -> Register
│   │   ├── MainTabNavigator.tsx     # 하단 탭: Home, Map, Feed, MyPage
│   │   ├── HomeStack.tsx            # Home -> SpotDetail
│   │   ├── FeedStack.tsx            # Feed -> PostDetail -> CreatePost
│   │   ├── MyPageStack.tsx          # MyPage -> Settings -> Diary 등
│   │   ├── QnAStack.tsx
│   │   ├── GuideStack.tsx
│   │   └── types.ts                 # 네비게이션 파라미터 타입
│   ├── screens/
│   │   ├── auth/     (Welcome, Login, Register, Onboarding)
│   │   ├── home/     (Home, SpotDetail)
│   │   ├── map/      (Map)
│   │   ├── feed/     (Feed, PostDetail, CreatePost)
│   │   ├── mypage/   (MyPage, EditProfile, Settings, Favorites, Notifications)
│   │   ├── diary/    (DiaryList, DiaryDetail, CreateDiary, DiaryCalendar)
│   │   ├── qna/      (QnAList, QuestionDetail, CreateQuestion)
│   │   ├── guide/    (GuideList, GuideDetail)
│   │   └── admin/    (Dashboard, Spots, Users, Posts, Reports)
│   ├── components/
│   │   ├── common/   (Button, Input, Card, Avatar, Badge, LoadingSpinner,
│   │   │              EmptyState, BottomSheet, ImagePicker, Toast,
│   │   │              Skeleton, InfiniteScrollList, StarRating)
│   │   ├── spot/     (SpotCard, SpotConditions, SpotVote, ForecastChart)
│   │   ├── feed/     (FeedPostCard, CommentItem, CommentInput, TagChip)
│   │   ├── diary/    (DiaryCard, DiaryForm)
│   │   ├── qna/      (QuestionCard, AnswerCard)
│   │   └── guide/    (GuideCard, ProgressBar)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLocation.ts
│   │   ├── useImagePicker.ts
│   │   ├── useDebounce.ts
│   │   └── useRefreshOnFocus.ts
│   ├── api/                         # API 호출 함수
│   │   ├── auth.api.ts
│   │   ├── spots.api.ts
│   │   ├── forecasts.api.ts
│   │   ├── diary.api.ts
│   │   ├── posts.api.ts
│   │   ├── comments.api.ts
│   │   ├── qna.api.ts
│   │   ├── guides.api.ts
│   │   ├── notifications.api.ts
│   │   ├── upload.api.ts
│   │   ├── users.api.ts
│   │   └── admin.api.ts
│   ├── queries/                     # TanStack Query 훅
│   │   ├── useSpots.ts
│   │   ├── useForecast.ts
│   │   ├── usePosts.ts
│   │   ├── useComments.ts
│   │   ├── useDiary.ts
│   │   ├── useQnA.ts
│   │   ├── useGuides.ts
│   │   ├── useNotifications.ts
│   │   ├── useUser.ts
│   │   └── keys.ts                  # 쿼리 키 팩토리
│   ├── stores/                      # Zustand
│   │   ├── authStore.ts
│   │   ├── locationStore.ts
│   │   ├── settingsStore.ts
│   │   └── onboardingStore.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── types/                       # 프론트 전용 타입
│   │   ├── navigation.types.ts
│   │   └── enums.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   ├── geo.ts
│   │   ├── storage.ts               # AsyncStorage 래퍼
│   │   └── permissions.ts
│   └── i18n/
│       ├── ko.json
│       └── en.json
```

### 1-3. `surf-wave-shared/` (공유 타입 패키지)

```
surf-wave-shared/
├── package.json                     # @surfwave/shared-types
├── tsconfig.json
└── src/
    ├── index.ts
    ├── enums/                       # 공유 enum (백엔드/프론트 동일)
    ├── dto/                         # API 요청/응답 인터페이스
    │   ├── api-response.dto.ts      # ApiResponse<T>, PaginatedResponse<T>
    │   ├── auth.dto.ts
    │   ├── user.dto.ts
    │   ├── spot.dto.ts
    │   ├── forecast.dto.ts
    │   ├── diary.dto.ts
    │   ├── post.dto.ts
    │   ├── comment.dto.ts
    │   ├── question.dto.ts
    │   ├── answer.dto.ts
    │   ├── guide.dto.ts
    │   ├── notification.dto.ts
    │   └── admin.dto.ts
    └── constants/
        └── app.constants.ts
```

---

## 2. DB 스키마 (20개 테이블)

### 테이블 목록 및 관계

```
users ──1:N──> spot_favorites <──N:1── spots
users ──1:N──> spot_votes <──N:1── spots
users ──1:N──> surf_diaries ──N:1──> spots
               surf_diaries ──1:N──> diary_images
users ──1:N──> posts ──N:1──> spots (optional)
               posts ──1:N──> post_images
               posts ──1:N──> comments (self-ref parent)
               posts ──1:N──> likes <──N:1── users
               posts ──1:N──> bookmarks <──N:1── users
users ──1:N──> reports ──N:1──> posts|comments
users ──1:N──> questions ──1:N──> answers <──N:1── users
users ──1:N──> guide_progress ──N:1──> guides
users ──1:N──> notifications
users ──1:N──> condition_alerts ──N:1──> spots
users ──1:N──> terms_agreements ──N:1──> terms
spots ──1:N──> forecasts
```

### 핵심 엔티티 컬럼 정의

#### `users`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| firebaseUid | varchar UNIQUE INDEX | Firebase UID |
| email | varchar UNIQUE INDEX | |
| nickname | varchar(30) UNIQUE | |
| bio | text NULL | |
| avatarUrl | varchar NULL | |
| role | enum(USER, ADMIN) | default USER |
| surfLevel | varchar NULL | 초보/중급/상급 |
| provider | enum(GOOGLE, APPLE) NULL | |
| fcmToken | varchar NULL | |
| notificationsEnabled | boolean | default true |
| isSuspended | boolean | default false |
| suspendedUntil | timestamp NULL | |
| lastLoginAt | timestamp NULL | |
| createdAt/updatedAt/deletedAt | timestamp | soft delete |

#### `spots`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name | varchar(100) INDEX | |
| description | text NULL | |
| imageUrl | varchar NULL | |
| latitude | decimal(10,7) INDEX | |
| longitude | decimal(10,7) INDEX | |
| address | varchar(100) NULL | |
| region | varchar(50) NULL | 양양/부산/속초/제주 |
| difficulty | enum(BEGINNER, INTERMEDIATE, ADVANCED) | |
| rating | decimal(3,1) | default 0 |
| ratingCount | int | default 0 |
| isActive | boolean | default true |
| amenities | jsonb NULL | hasSurfShop, hasShower, hasParking 등 |
| createdAt/updatedAt/deletedAt | timestamp | |

#### `spot_favorites`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| userId | uuid FK INDEX | UNIQUE(userId, spotId) |
| spotId | uuid FK INDEX | |
| createdAt | timestamp | |

#### `spot_votes`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| userId | uuid FK INDEX | UNIQUE(userId, spotId, votedDate) |
| spotId | uuid FK INDEX | |
| voteType | enum(PERFECT, FLAT, MEDIOCRE) | |
| votedDate | date | 하루 1표 제한 |
| createdAt | timestamp | |

#### `forecasts`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| spotId | uuid FK INDEX | INDEX(spotId, forecastTime) |
| forecastTime | timestamptz | 예보 시점 |
| waveHeight | decimal(4,2) | 미터 |
| wavePeriod | decimal(4,1) | 초 |
| waveDirection | decimal(5,2) | 0-360도 |
| windSpeed | decimal(5,2) | km/h |
| windGusts | decimal(5,2) | km/h |
| windDirection | enum(N,NE,E,SE,S,SW,W,NW) | |
| tideHeight | decimal(4,2) | 미터 |
| tideStatus | enum(HIGH, LOW, RISING, FALLING) | |
| waterTemperature | decimal(4,1) NULL | |
| airTemperature | decimal(4,1) NULL | |
| weatherCondition | varchar(50) NULL | |
| fetchedAt | timestamptz | 데이터 수집 시점 |
| source | varchar(30) | open-meteo 등 |
| createdAt | timestamp | |

#### `surf_diaries`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| userId | uuid FK INDEX | |
| spotId | uuid FK INDEX | |
| surfDate | date INDEX | |
| boardType | enum(LONGBOARD, SHORTBOARD, FUNBOARD, ...) | |
| durationMinutes | int | |
| satisfaction | smallint | 1-5 |
| memo | text NULL | |
| visibility | enum(PUBLIC, PRIVATE) | default PRIVATE |
| waveHeight/wavePeriod/windSpeed/windDirection | 자동 캡처 | |
| createdAt/updatedAt/deletedAt | timestamp | |

#### `diary_images`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| diaryId | uuid FK INDEX | CASCADE |
| imageUrl | varchar | |
| sortOrder | smallint | default 0 |

#### `posts`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| authorId | uuid FK INDEX | |
| spotId | uuid FK INDEX NULL | |
| content | text | |
| tags | text[] NULL | |
| likeCount | int | default 0 |
| commentCount | int | default 0 |
| bookmarkCount | int | default 0 |
| isHidden | boolean | default false (관리자 숨김) |
| createdAt INDEX /updatedAt/deletedAt | timestamp | |

#### `post_images` - diary_images와 동일 구조 (postId FK)

#### `comments` (대댓글 지원)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| postId | uuid FK INDEX | |
| authorId | uuid FK INDEX | |
| parentId | uuid FK INDEX NULL | self-ref (대댓글) |
| content | text | |
| likeCount | int | default 0 |
| depth | smallint | 0=최상위, 1=답글 (최대 2단계) |
| createdAt INDEX /updatedAt/deletedAt | timestamp | |

#### `likes` - UNIQUE(userId, postId)
#### `bookmarks` - UNIQUE(userId, postId)

#### `reports`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| reporterId | uuid FK INDEX | |
| postId | uuid FK INDEX NULL | |
| commentId | uuid FK INDEX NULL | |
| reason | enum(SPAM, INAPPROPRIATE, ...) | |
| description | text NULL | |
| status | enum(PENDING, REVIEWED, RESOLVED) INDEX | |
| adminNote | text NULL | |
| resolvedById | uuid NULL | |
| resolvedAt | timestamp NULL | |
| createdAt | timestamp | |

#### `questions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| authorId | uuid FK INDEX | |
| title | varchar(200) | |
| content | text | |
| tags | text[] NULL | |
| answerCount | int | default 0 |
| viewCount | int | default 0 |
| acceptedAnswerId | uuid NULL | |
| isClosed | boolean | default false |
| createdAt INDEX /updatedAt/deletedAt | timestamp | |

#### `answers`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| questionId | uuid FK INDEX | |
| authorId | uuid FK INDEX | |
| content | text | |
| isAccepted | boolean | default false |
| likeCount | int | default 0 |
| createdAt INDEX /updatedAt/deletedAt | timestamp | |

#### `guides`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| title | varchar(200) | |
| content | text | Markdown |
| category | enum(BASICS, SAFETY, EQUIPMENT, ETIQUETTE) INDEX | |
| thumbnailUrl | varchar NULL | |
| sortOrder | smallint | |
| estimatedReadMinutes | int | |
| isPublished | boolean | default true |
| createdAt/updatedAt | timestamp | |

#### `guide_progress` - UNIQUE(userId, guideId), isCompleted, completedAt
#### `notifications` - userId FK, type enum, title, body, data jsonb, isRead INDEX
#### `condition_alerts` - userId FK, spotId FK, minWaveHeight, maxWindSpeed, isActive
#### `terms` - title, content, version, isRequired, isActive
#### `terms_agreements` - UNIQUE(userId, termsId), agreed, agreedAt

---

## 3. REST API 엔드포인트 (전체)

모든 엔드포인트 prefix: `/api/v1`

### Auth
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | /auth/register | Firebase 가입 후 서버 등록 | X |
| POST | /auth/login | Firebase 토큰 검증, 프로필 반환 | X |
| DELETE | /auth/withdraw | 회원탈퇴 (soft delete) | O |

### Users
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /users/me | 내 프로필 | O |
| PATCH | /users/me | 프로필 수정 | O |
| PATCH | /users/me/fcm-token | FCM 토큰 갱신 | O |
| GET | /users/me/stats | 내 통계 | O |
| GET | /users/:userId | 타인 프로필 | O |

### Spots
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /spots | 스팟 목록 (region, difficulty 필터) | O |
| GET | /spots/nearby | 주변 스팟 (?lat=&lng=&radius=) | O |
| GET | /spots/:spotId | 스팟 상세 | O |
| GET | /spots/:spotId/votes | 투표 분포 | O |
| POST | /spots/:spotId/vote | 투표 (하루 1회) | O |
| GET | /spots/favorites | 즐겨찾기 목록 | O |
| POST | /spots/:spotId/favorite | 즐겨찾기 추가 | O |
| DELETE | /spots/:spotId/favorite | 즐겨찾기 제거 | O |

### Forecasts
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /spots/:spotId/forecast | 시간별 예보 (?date=&hours=24) | O |
| GET | /spots/:spotId/forecast/current | 현재 상태 | O |
| GET | /spots/:spotId/forecast/weekly | 7일 요약 | O |

### Diary
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /diary | 내 일기 목록 | O |
| GET | /diary/calendar | 캘린더용 월별 조회 | O |
| GET | /diary/:diaryId | 일기 상세 | O |
| POST | /diary | 일기 작성 | O |
| PATCH | /diary/:diaryId | 일기 수정 | O |
| DELETE | /diary/:diaryId | 일기 삭제 | O |
| GET | /diary/public | 공개 일기 목록 | O |

### Community
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /community/posts | 글 목록 (정렬/필터) | O |
| GET | /community/posts/:postId | 글 상세 | O |
| POST | /community/posts | 글 작성 | O |
| PATCH | /community/posts/:postId | 글 수정 | O |
| DELETE | /community/posts/:postId | 글 삭제 | O |
| POST | /community/posts/:postId/like | 좋아요 토글 | O |
| POST | /community/posts/:postId/bookmark | 북마크 토글 | O |
| POST | /community/posts/:postId/report | 신고 | O |
| GET | /community/posts/:postId/comments | 댓글 목록 | O |
| POST | /community/posts/:postId/comments | 댓글 작성 | O |
| PATCH | /community/comments/:commentId | 댓글 수정 | O |
| DELETE | /community/comments/:commentId | 댓글 삭제 | O |
| GET | /community/bookmarks | 내 북마크 목록 | O |

### Q&A
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /qna/questions | 질문 목록 | O |
| GET | /qna/questions/:questionId | 질문 상세 + 답변 | O |
| POST | /qna/questions | 질문 작성 | O |
| PATCH | /qna/questions/:questionId | 질문 수정 | O |
| DELETE | /qna/questions/:questionId | 질문 삭제 | O |
| POST | /qna/questions/:questionId/answers | 답변 작성 | O |
| PATCH | /qna/answers/:answerId | 답변 수정 | O |
| DELETE | /qna/answers/:answerId | 답변 삭제 | O |
| POST | /qna/questions/:questionId/accept/:answerId | 답변 채택 | O |

### Guides
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /guides | 가이드 목록 (카테고리별) | O |
| GET | /guides/:guideId | 가이드 상세 | O |
| POST | /guides/:guideId/complete | 읽음 처리 | O |
| GET | /guides/progress | 내 진행률 | O |

### Notifications
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /notifications | 알림 목록 | O |
| GET | /notifications/unread-count | 미읽음 수 | O |
| PATCH | /notifications/:id/read | 읽음 처리 | O |
| PATCH | /notifications/read-all | 전체 읽음 | O |
| GET | /condition-alerts | 조건 알림 목록 | O |
| POST | /condition-alerts | 조건 알림 생성 | O |
| PATCH | /condition-alerts/:alertId | 조건 알림 수정 | O |
| DELETE | /condition-alerts/:alertId | 조건 알림 삭제 | O |

### Upload
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | /upload/image | 단일 이미지 업로드 | O |
| POST | /upload/images | 다중 이미지 (최대 5장) | O |
| POST | /upload/presigned-url | S3 다이렉트 업로드 URL | O |

### Terms
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /terms | 약관 목록 | X |
| POST | /terms/agree | 약관 동의 | O |
| GET | /terms/agreements | 내 동의 현황 | O |

### Admin
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /admin/dashboard | 대시보드 통계 | Admin |
| GET | /admin/users | 사용자 목록 | Admin |
| PATCH | /admin/users/:userId/suspend | 정지/해제 | Admin |
| PATCH | /admin/users/:userId/role | 역할 변경 | Admin |
| POST | /admin/spots | 스팟 생성 | Admin |
| PATCH | /admin/spots/:spotId | 스팟 수정 | Admin |
| DELETE | /admin/spots/:spotId | 스팟 삭제 | Admin |
| GET | /admin/reports | 신고 목록 | Admin |
| PATCH | /admin/reports/:reportId | 신고 처리 | Admin |
| PATCH | /admin/posts/:postId/hide | 글 숨김 | Admin |
| POST | /admin/guides | 가이드 생성 | Admin |
| PATCH | /admin/guides/:guideId | 가이드 수정 | Admin |
| POST | /admin/notifications/broadcast | 전체 공지 | Admin |

---

## 4. Redis 캐싱 전략

| 데이터 | TTL | 키 패턴 |
|--------|-----|---------|
| 현재 예보 | 15분 | `forecast:current:{spotId}` |
| 시간별 예보 | 30분 | `forecast:hourly:{spotId}:{date}` |
| 스팟 목록 | 5분 | `spots:list:{region}:{difficulty}:{page}` |
| 투표 분포 | 2분 | `votes:{spotId}:{date}` |
| 미읽음 알림 수 | 1분 | `notifications:unread:{userId}` |
| 가이드 목록 | 1시간 | `guides:list:{category}` |

---

## 5. 외부 API 연동

### Open-Meteo Marine API
- 무료, API 키 불필요
- 30분 간격 cron으로 활성 스팟 전체 예보 수집
- 3시간 간격으로 7일 예보 수집
- `@nestjs/schedule` 사용

---

## 6. 구현 순서 (Phase별)

### Phase 1 (MVP)
1. 3개 레포 스캐폴딩 생성
2. 백엔드: auth, users, spots, forecasts 모듈
3. 모바일: 인증 플로우, 홈, 스팟 상세, 지도, 즐겨찾기
4. docker-compose로 로컬 개발 환경

### Phase 2
1. 백엔드: diary, community (posts/comments/likes/bookmarks/reports), upload
2. 모바일: 피드, 일기, 글 작성/수정, 이미지 업로드

### Phase 3
1. 백엔드: qna, guides, notifications, condition_alerts
2. 모바일: Q&A, 가이드, 알림, FCM 푸시

### Phase 4
1. 온보딩 플로우
2. 캘린더 뷰
3. 추천 기능
4. 관리자 화면
5. 성능 최적화

---

## 7. 검증 방법

1. **백엔드**: `docker-compose up` -> PostgreSQL + Redis 실행 -> `npm run start:dev` -> Swagger (`/api/docs`)에서 전 엔드포인트 테스트
2. **모바일**: `npx react-native run-ios` / `run-android` -> 각 화면 네비게이션 확인
3. **DB**: TypeORM migration으로 스키마 생성 확인, seed 데이터로 API 응답 검증
4. **통합**: 모바일 -> 백엔드 API 호출 -> DB 저장/조회 E2E 흐름 확인
