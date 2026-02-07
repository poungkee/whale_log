# Whale Log - Database Schema

> **Last Updated**: 2026-02-07
> **Database**: PostgreSQL
> **ORM**: TypeORM
> **Total Tables**: 21

---

## Table of Contents

1. [Base Entity (공통 필드)](#1-base-entity-공통-필드)
2. [MVP Phase 1 Tables](#2-mvp-phase-1-tables)
   - [users](#21-users)
   - [spots](#22-spots)
   - [spot_favorites](#23-spot_favorites)
   - [spot_votes](#24-spot_votes)
   - [forecasts](#25-forecasts-)
3. [Phase 2+ Tables](#3-phase-2-tables)
   - [surf_diaries](#31-surf_diaries)
   - [diary_images](#32-diary_images)
   - [posts](#33-posts)
   - [post_images](#34-post_images)
   - [comments](#35-comments)
   - [likes](#36-likes)
   - [bookmarks](#37-bookmarks)
   - [reports](#38-reports)
   - [guides](#39-guides)
   - [guide_progress](#310-guide_progress)
   - [questions](#311-questions)
   - [answers](#312-answers)
   - [notifications](#313-notifications)
   - [condition_alerts](#314-condition_alerts)
   - [terms](#315-terms)
   - [terms_agreements](#316-terms_agreements)
4. [Enum Definitions](#4-enum-definitions)
5. [ER Diagram (관계도)](#5-er-diagram-관계도)
6. [Indexes & Constraints](#6-indexes--constraints)

---

## 1. Base Entity (공통 필드)

`BaseEntity`를 상속하는 테이블은 아래 4개 컬럼을 자동으로 포함합니다.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `uuid` (PK) | NO | UUID v4 자동 생성 |
| `created_at` | `timestamptz` | NO | 레코드 생성 시각 (자동) |
| `updated_at` | `timestamptz` | NO | 레코드 수정 시각 (자동 갱신) |
| `deleted_at` | `timestamptz` | YES | 소프트 삭제 시각 (null = 활성) |

> **상속 테이블**: users, spots, surf_diaries, posts, comments, reports, questions, answers

---

## 2. MVP Phase 1 Tables

### 2.1 `users`

> 사용자 계정 정보. Firebase Auth 연동, 소셜 로그인 지원.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `firebase_uid` | `varchar` | NO | | Firebase UID (UNIQUE) |
| `email` | `varchar` | NO | | 이메일 (UNIQUE) |
| `nickname` | `varchar(30)` | NO | | 닉네임 (UNIQUE) |
| `bio` | `text` | YES | | 자기소개 |
| `avatar_url` | `varchar` | YES | | 프로필 사진 URL |
| `role` | `enum(Role)` | NO | `USER` | 사용자 역할 |
| `surf_level` | `varchar` | YES | | 서핑 실력 레벨 |
| `provider` | `enum(SocialProvider)` | YES | | 소셜 로그인 제공자 |
| `fcm_token` | `varchar` | YES | | FCM 푸시 알림 토큰 |
| `notifications_enabled` | `boolean` | NO | `true` | 알림 수신 여부 |
| `is_suspended` | `boolean` | NO | `false` | 계정 정지 여부 |
| `suspended_until` | `timestamp` | YES | | 정지 해제 예정 시각 |
| `last_login_at` | `timestamp` | YES | | 마지막 로그인 시각 |

**Relations**: spots(favorites, votes), surf_diaries, posts, comments, questions, answers, notifications, condition_alerts, terms_agreements

---

### 2.2 `spots`

> 서핑 스팟(해변) 정보. GPS 좌표, 난이도, 평점 등.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `name` | `varchar(100)` | NO | | 스팟 이름 |
| `description` | `text` | YES | | 스팟 설명 |
| `image_url` | `varchar` | YES | | 대표 이미지 URL |
| `latitude` | `decimal(10,7)` | NO | | 위도 |
| `longitude` | `decimal(10,7)` | NO | | 경도 |
| `address` | `varchar(100)` | YES | | 주소 |
| `region` | `varchar(50)` | YES | | 지역 (예: 양양, 발리) |
| `difficulty` | `enum(Difficulty)` | NO | | 난이도 |
| `rating` | `decimal(3,1)` | NO | `0` | 평균 평점 |
| `rating_count` | `int` | NO | `0` | 평점 참여 수 |
| `is_active` | `boolean` | NO | `true` | 활성 상태 |
| `amenities` | `jsonb` | YES | | 부대시설 (JSON) |

**Relations**: forecasts, spot_favorites, spot_votes, surf_diaries

---

### 2.3 `spot_favorites`

> 사용자의 스팟 즐겨찾기. BaseEntity 미상속 (독립 PK).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 자동 생성 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `spot_id` | `uuid` (FK) | NO | | 스팟 ID |
| `created_at` | `timestamptz` | NO | | 즐겨찾기 등록 시각 |

**Constraints**: `UQ_spot_favorite_user_spot (user_id, spot_id)` UNIQUE
**FK**: user_id -> users(id) CASCADE, spot_id -> spots(id) CASCADE

---

### 2.4 `spot_votes`

> 스팟 오늘의 파도 컨디션 투표 (하루 1회 제한).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 자동 생성 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `spot_id` | `uuid` (FK) | NO | | 스팟 ID |
| `vote_type` | `enum(VoteType)` | NO | | 투표 유형 (UP/DOWN) |
| `voted_date` | `date` | NO | | 투표 날짜 |
| `created_at` | `timestamptz` | NO | | 투표 시각 |

**Constraints**: `UQ_spot_vote_user_spot_date (user_id, spot_id, voted_date)` UNIQUE
**FK**: user_id -> users(id) CASCADE, spot_id -> spots(id) CASCADE

---

### 2.5 `forecasts` ⭐

> **MVP 핵심 테이블**. 스팟별 시간대별 파도/스웰/바람 예보 데이터.
>
> **데이터 소스**: Open-Meteo Marine API (파도/스웰) + Open-Meteo Weather API (바람)
> **수집 주기**: 30분 크론
> **저장 방식**: (spot_id, forecast_time) 기준 upsert

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 자동 생성 |
| `spot_id` | `uuid` (FK) | NO | | 스팟 ID |
| `forecast_time` | `timestamptz` | NO | | 예보 시각 (시간 단위) |
| `wave_height` | `decimal(4,2)` | NO | | 전체 파도 높이 (m) |
| `wave_period` | `decimal(4,1)` | NO | | 파도 주기 (s) |
| `wave_direction` | `decimal(5,2)` | NO | | 파도 방향 (degree) |
| `swell_height` | `decimal(4,2)` | YES | | 스웰 높이 (m) |
| `swell_period` | `decimal(4,1)` | YES | | 스웰 주기 (s) |
| `swell_direction` | `decimal(5,2)` | YES | | 스웰 방향 (degree) |
| `wind_speed` | `decimal(5,2)` | YES | | 풍속 10m (km/h) |
| `wind_gusts` | `decimal(5,2)` | YES | | 돌풍 10m (km/h) |
| `wind_direction` | `decimal(5,2)` | YES | | 풍향 (degree) |
| `tide_height` | `decimal(4,2)` | YES | | 조위 (m) - Phase 2+ |
| `tide_status` | `enum(TideStatus)` | YES | | 조석 상태 - Phase 2+ |
| `water_temperature` | `decimal(4,1)` | YES | | 수온 (C) - Phase 2+ |
| `air_temperature` | `decimal(4,1)` | YES | | 기온 (C) - Phase 2+ |
| `weather_condition` | `varchar(50)` | YES | | 날씨 상태 - Phase 2+ |
| `fetched_at` | `timestamptz` | NO | | API 호출 시각 |
| `source` | `varchar(30)` | NO | | 데이터 소스 (`open-meteo`) |
| `created_at` | `timestamptz` | NO | | 레코드 생성 시각 |

**Constraints**: `UQ_forecast_spot_time (spot_id, forecast_time)` UNIQUE
**Index**: `IDX_forecast_spot_time (spot_id, forecast_time)`
**FK**: spot_id -> spots(id) CASCADE

> **MVP 필수 필드**: forecast_time, wave_height, wave_period, wave_direction, swell_height, swell_period, swell_direction, wind_speed, wind_direction, source
>
> **Phase 2+ 필드** (nullable): tide_height, tide_status, water_temperature, air_temperature, weather_condition
>
> **변경사항 (기존 대비)**:
> - `swell_height`, `swell_period`, `swell_direction` 컬럼 신규 추가
> - `wind_direction` 타입 변경: `enum(WindDirection)` -> `decimal(5,2)` (API가 각도로 제공)
> - `wind_speed`, `wind_gusts`, `wind_direction` nullable 전환 (Weather API 실패 시 null)
> - `tide_height`, `tide_status` nullable 전환 (현재 데이터 소스 없음)
> - `(spot_id, forecast_time)` UNIQUE 제약 추가 (upsert용)

---

## 3. Phase 2+ Tables

### 3.1 `surf_diaries`

> 서핑 일기. 서핑 날짜, 보드 종류, 시간, 만족도, 기상 기록.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `user_id` | `uuid` (FK) | NO | | 작성자 ID |
| `spot_id` | `uuid` (FK) | NO | | 스팟 ID |
| `surf_date` | `date` | NO | | 서핑 날짜 |
| `board_type` | `enum(BoardType)` | NO | | 보드 종류 |
| `duration_minutes` | `int` | NO | | 서핑 시간 (분) |
| `satisfaction` | `smallint` | NO | | 만족도 (1-5) |
| `memo` | `text` | YES | | 메모 |
| `visibility` | `enum(Visibility)` | NO | `PRIVATE` | 공개 범위 |
| `wave_height` | `decimal` | YES | | 파고 (m) |
| `wave_period` | `decimal` | YES | | 파주기 (s) |
| `wind_speed` | `decimal` | YES | | 풍속 |
| `wind_direction` | `enum(WindDirection)` | YES | | 풍향 |

**FK**: user_id -> users(id) CASCADE, spot_id -> spots(id) CASCADE
**Relations**: diary_images

---

### 3.2 `diary_images`

> 서핑 일기 첨부 이미지.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `diary_id` | `uuid` (FK) | NO | | 일기 ID |
| `image_url` | `varchar` | NO | | 이미지 URL |
| `sort_order` | `smallint` | NO | `0` | 정렬 순서 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |

**FK**: diary_id -> surf_diaries(id) CASCADE

---

### 3.3 `posts`

> 커뮤니티 게시글.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `author_id` | `uuid` (FK) | NO | | 작성자 ID |
| `spot_id` | `uuid` (FK) | YES | | 관련 스팟 ID |
| `content` | `text` | NO | | 게시글 내용 |
| `tags` | `simple-array` | YES | | 태그 목록 |
| `like_count` | `int` | NO | `0` | 좋아요 수 |
| `comment_count` | `int` | NO | `0` | 댓글 수 |
| `bookmark_count` | `int` | NO | `0` | 북마크 수 |
| `is_hidden` | `boolean` | NO | `false` | 숨김 여부 |

**Index**: `IDX_post_author (author_id)`
**FK**: author_id -> users(id) CASCADE, spot_id -> spots(id) SET NULL
**Relations**: post_images, comments, likes, bookmarks

---

### 3.4 `post_images`

> 게시글 첨부 이미지.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `post_id` | `uuid` (FK) | NO | | 게시글 ID |
| `image_url` | `varchar` | NO | | 이미지 URL |
| `sort_order` | `smallint` | NO | `0` | 정렬 순서 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |

**FK**: post_id -> posts(id) CASCADE

---

### 3.5 `comments`

> 게시글 댓글. 대댓글은 parent_id 자기참조.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `post_id` | `uuid` (FK) | NO | | 게시글 ID |
| `author_id` | `uuid` (FK) | NO | | 작성자 ID |
| `parent_id` | `uuid` (FK) | YES | | 부모 댓글 ID (대댓글) |
| `content` | `text` | NO | | 댓글 내용 |
| `like_count` | `int` | NO | `0` | 좋아요 수 |
| `depth` | `smallint` | NO | `0` | 댓글 깊이 (0=최상위) |

**Index**: `IDX_comment_post (post_id)`
**FK**: post_id -> posts(id) CASCADE, author_id -> users(id) CASCADE, parent_id -> comments(id) CASCADE

---

### 3.6 `likes`

> 게시글 좋아요.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `post_id` | `uuid` (FK) | NO | | 게시글 ID |
| `created_at` | `timestamptz` | NO | | 좋아요 시각 |

**Constraints**: `UQ_like_user_post (user_id, post_id)` UNIQUE
**FK**: user_id -> users(id) CASCADE, post_id -> posts(id) CASCADE

---

### 3.7 `bookmarks`

> 게시글 북마크(저장).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `post_id` | `uuid` (FK) | NO | | 게시글 ID |
| `created_at` | `timestamptz` | NO | | 북마크 시각 |

**Constraints**: `UQ_bookmark_user_post (user_id, post_id)` UNIQUE
**FK**: user_id -> users(id) CASCADE, post_id -> posts(id) CASCADE

---

### 3.8 `reports`

> 게시글/댓글 신고.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `reporter_id` | `uuid` (FK) | NO | | 신고자 ID |
| `post_id` | `uuid` (FK) | YES | | 신고 대상 게시글 |
| `comment_id` | `uuid` (FK) | YES | | 신고 대상 댓글 |
| `reason` | `enum(ReportReason)` | NO | | 신고 사유 |
| `description` | `text` | YES | | 상세 설명 |
| `status` | `enum(ReportStatus)` | NO | `PENDING` | 처리 상태 |
| `admin_note` | `text` | YES | | 관리자 메모 |
| `resolved_by_id` | `uuid` (FK) | YES | | 처리한 관리자 ID |
| `resolved_at` | `timestamp` | YES | | 처리 시각 |

**Index**: `IDX_report_status (status)`
**FK**: reporter_id -> users(id) CASCADE, post_id -> posts(id) SET NULL, comment_id -> comments(id) SET NULL

---

### 3.9 `guides`

> 서핑 가이드/교육 콘텐츠. BaseEntity 미상속.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `title` | `varchar(200)` | NO | | 가이드 제목 |
| `content` | `text` | NO | | 가이드 내용 |
| `category` | `enum(GuideCategory)` | NO | | 카테고리 |
| `thumbnail_url` | `varchar` | YES | | 썸네일 이미지 URL |
| `sort_order` | `smallint` | NO | | 정렬 순서 |
| `estimated_read_minutes` | `int` | NO | | 예상 읽기 시간 (분) |
| `is_published` | `boolean` | NO | `true` | 공개 여부 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |
| `updated_at` | `timestamptz` | NO | | 수정 시각 |

---

### 3.10 `guide_progress`

> 사용자별 가이드 학습 진행도.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `guide_id` | `uuid` (FK) | NO | | 가이드 ID |
| `is_completed` | `boolean` | NO | `false` | 완료 여부 |
| `completed_at` | `timestamp` | YES | | 완료 시각 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |

**Constraints**: `UQ_guide_progress_user_guide (user_id, guide_id)` UNIQUE
**FK**: user_id -> users(id) CASCADE, guide_id -> guides(id) CASCADE

---

### 3.11 `questions`

> Q&A 질문.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `author_id` | `uuid` (FK) | NO | | 작성자 ID |
| `title` | `varchar(200)` | NO | | 질문 제목 |
| `content` | `text` | NO | | 질문 내용 |
| `tags` | `simple-array` | YES | | 태그 목록 |
| `answer_count` | `int` | NO | `0` | 답변 수 |
| `view_count` | `int` | NO | `0` | 조회 수 |
| `accepted_answer_id` | `uuid` | YES | | 채택된 답변 ID |
| `is_closed` | `boolean` | NO | `false` | 마감 여부 |

**Index**: `IDX_question_author (author_id)`
**FK**: author_id -> users(id) CASCADE
**Relations**: answers

---

### 3.12 `answers`

> Q&A 답변.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(BaseEntity 공통 4개 컬럼)* | | | | |
| `question_id` | `uuid` (FK) | NO | | 질문 ID |
| `author_id` | `uuid` (FK) | NO | | 작성자 ID |
| `content` | `text` | NO | | 답변 내용 |
| `is_accepted` | `boolean` | NO | `false` | 채택 여부 |
| `like_count` | `int` | NO | `0` | 좋아요 수 |

**Index**: `IDX_answer_question (question_id)`
**FK**: question_id -> questions(id) CASCADE, author_id -> users(id) CASCADE

---

### 3.13 `notifications`

> 푸시 알림 기록. BaseEntity 미상속.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `user_id` | `uuid` (FK) | NO | | 수신자 ID |
| `type` | `enum(NotificationType)` | NO | | 알림 유형 |
| `title` | `varchar` | NO | | 알림 제목 |
| `body` | `text` | NO | | 알림 본문 |
| `data` | `jsonb` | YES | | 추가 데이터 (JSON) |
| `is_read` | `boolean` | NO | `false` | 읽음 여부 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |
| `updated_at` | `timestamptz` | NO | | 수정 시각 |

**Index**: `IDX_notification_user (user_id)`
**FK**: user_id -> users(id) CASCADE

---

### 3.14 `condition_alerts`

> 파도 조건 자동 알림 설정. "파고 1.5m 이상이면 알려줘" 등.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `spot_id` | `uuid` (FK) | NO | | 스팟 ID |
| `min_wave_height` | `decimal` | YES | | 최소 파고 조건 (m) |
| `max_wind_speed` | `decimal` | YES | | 최대 풍속 조건 |
| `is_active` | `boolean` | NO | `true` | 활성 여부 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |
| `updated_at` | `timestamptz` | NO | | 수정 시각 |

**FK**: user_id -> users(id) CASCADE, spot_id -> spots(id) CASCADE

---

### 3.15 `terms`

> 이용약관. 버전 관리 지원. BaseEntity 미상속.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `title` | `varchar` | NO | | 약관 제목 |
| `content` | `text` | NO | | 약관 내용 |
| `version` | `int` | NO | | 약관 버전 |
| `is_required` | `boolean` | NO | | 필수 동의 여부 |
| `is_active` | `boolean` | NO | `true` | 현재 활성 약관 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |
| `updated_at` | `timestamptz` | NO | | 수정 시각 |

---

### 3.16 `terms_agreements`

> 사용자별 약관 동의 이력.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` (PK) | NO | | UUID v4 |
| `user_id` | `uuid` (FK) | NO | | 사용자 ID |
| `terms_id` | `uuid` (FK) | NO | | 약관 ID |
| `agreed` | `boolean` | NO | | 동의 여부 |
| `agreed_at` | `timestamp` | NO | | 동의 시각 |
| `created_at` | `timestamptz` | NO | | 생성 시각 |

**Constraints**: `UQ_terms_agreement_user_terms (user_id, terms_id)` UNIQUE
**FK**: user_id -> users(id) CASCADE, terms_id -> terms(id) CASCADE

---

## 4. Enum Definitions

### Role
| Value | Description |
|-------|-------------|
| `USER` | 일반 사용자 |
| `ADMIN` | 관리자 |

### SocialProvider
| Value | Description |
|-------|-------------|
| `GOOGLE` | 구글 로그인 |
| `APPLE` | 애플 로그인 |
| `KAKAO` | 카카오 로그인 |

### Difficulty
| Value | Description |
|-------|-------------|
| `BEGINNER` | 초급 |
| `INTERMEDIATE` | 중급 |
| `ADVANCED` | 상급 |
| `EXPERT` | 전문가 |

### VoteType
| Value | Description |
|-------|-------------|
| `UP` | 좋아요 (파도 좋음) |
| `DOWN` | 별로 (파도 안 좋음) |

### BoardType
| Value | Description |
|-------|-------------|
| `SHORTBOARD` | 숏보드 |
| `LONGBOARD` | 롱보드 |
| `FUNBOARD` | 펀보드 |
| `FISH` | 피쉬보드 |
| `SUP` | 스탠드업 패들보드 |
| `BODYBOARD` | 바디보드 |
| `FOIL` | 포일보드 |
| `OTHER` | 기타 |

### Visibility
| Value | Description |
|-------|-------------|
| `PUBLIC` | 전체 공개 |
| `PRIVATE` | 비공개 |
| `FRIENDS` | 친구 공개 |

### TideStatus
| Value | Description |
|-------|-------------|
| `HIGH` | 만조 |
| `LOW` | 간조 |
| `RISING` | 밀물 (상승 중) |
| `FALLING` | 썰물 (하강 중) |

### ReportReason
| Value | Description |
|-------|-------------|
| `SPAM` | 스팸 |
| `HARASSMENT` | 괴롭힘 |
| `INAPPROPRIATE` | 부적절한 콘텐츠 |
| `MISINFORMATION` | 허위 정보 |
| `OTHER` | 기타 |

### ReportStatus
| Value | Description |
|-------|-------------|
| `PENDING` | 대기 중 |
| `REVIEWED` | 검토 중 |
| `RESOLVED` | 처리 완료 |
| `DISMISSED` | 기각 |

### NotificationType
| Value | Description |
|-------|-------------|
| `COMMENT` | 댓글 알림 |
| `REPLY` | 대댓글 알림 |
| `LIKE` | 좋아요 알림 |
| `ANSWER` | 답변 알림 |
| `CONDITION_ALERT` | 파도 조건 알림 |
| `SYSTEM` | 시스템 알림 |
| `BROADCAST` | 전체 공지 |

### GuideCategory
| Value | Description |
|-------|-------------|
| `BEGINNER` | 입문 가이드 |
| `TECHNIQUE` | 기술/테크닉 |
| `SAFETY` | 안전 |
| `EQUIPMENT` | 장비 |
| `ETIQUETTE` | 서핑 에티켓 |
| `WEATHER` | 날씨/기상 |

---

## 5. ER Diagram (관계도)

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │──1:N──│spot_favorites│──N:1──│  spots   │
│          │──1:N──│  spot_votes  │──N:1──│          │
│          │       └──────────────┘       │          │
│          │                              │          │
│          │──1:N──┌──────────────┐──N:1──│          │
│          │       │  forecasts   │       │          │
│          │       └──────────────┘       │          │
│          │                              │          │
│          │──1:N──┌──────────────┐──N:1──│          │
│          │       │ surf_diaries │       │          │
│          │       │   │         │       └──────────┘
│          │       │   └─1:N─diary_images
│          │       └──────────────┘
│          │
│          │──1:N──┌──────────────┐
│          │       │    posts     │──1:N──post_images
│          │       │              │──1:N──comments (self-ref)
│          │       │              │──1:N──likes
│          │       │              │──1:N──bookmarks
│          │       └──────────────┘
│          │
│          │──1:N──┌──────────────┐
│          │       │  questions   │──1:N──answers
│          │       └──────────────┘
│          │
│          │──1:N──notifications
│          │──1:N──condition_alerts
│          │──1:N──terms_agreements──N:1──terms
│          │──1:N──guide_progress──N:1──guides
│          │──1:N──reports
└──────────┘
```

---

## 6. Indexes & Constraints

### UNIQUE Constraints

| Table | Constraint Name | Columns |
|-------|----------------|---------|
| users | (auto) | firebase_uid |
| users | (auto) | email |
| users | (auto) | nickname |
| spot_favorites | UQ_spot_favorite_user_spot | (user_id, spot_id) |
| spot_votes | UQ_spot_vote_user_spot_date | (user_id, spot_id, voted_date) |
| forecasts | UQ_forecast_spot_time | (spot_id, forecast_time) |
| likes | UQ_like_user_post | (user_id, post_id) |
| bookmarks | UQ_bookmark_user_post | (user_id, post_id) |
| guide_progress | UQ_guide_progress_user_guide | (user_id, guide_id) |
| terms_agreements | UQ_terms_agreement_user_terms | (user_id, terms_id) |

### Indexes

| Table | Index Name | Columns |
|-------|-----------|---------|
| forecasts | IDX_forecast_spot_time | (spot_id, forecast_time) |
| posts | IDX_post_author | (author_id) |
| comments | IDX_comment_post | (post_id) |
| questions | IDX_question_author | (author_id) |
| answers | IDX_answer_question | (question_id) |
| reports | IDX_report_status | (status) |
| notifications | IDX_notification_user | (user_id) |

### Soft Delete 적용 테이블

`deleted_at IS NULL` 조건이 자동 적용되는 테이블:
- users, spots, surf_diaries, posts, comments, reports, questions, answers

---

> **Note**: forecasts 테이블의 스키마는 MVP 구현 시 기존 스켈레톤에서 변경될 예정입니다.
> 변경 내용은 [2.5 forecasts](#25-forecasts-) 섹션의 하단 변경사항을 참조하세요.
