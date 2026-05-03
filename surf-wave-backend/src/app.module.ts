/**
 * @file app.module.ts
 * @description 서프 웨이브 백엔드 애플리케이션의 루트 모듈 (Root Module)
 *
 * NestJS 애플리케이션의 최상위 모듈로, 모든 기능 모듈들을 통합합니다.
 * 이 파일에서 다음을 설정합니다:
 * - 환경 변수 설정 (ConfigModule) : .env 파일에서 환경 변수를 로드
 * - 데이터베이스 연결 (TypeOrmModule) : PostgreSQL DB 연결 설정
 * - 작업 스케줄링 (ScheduleModule) : 크론 작업, 주기적 실행 지원 (예: 파도 예보 주기적 갱신)
 * - 12개의 기능 모듈 등록 : 인증, 사용자, 서핑 스팟, 파도 예보, 다이어리, 커뮤니티 등
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { getDatabaseConfig } from './config/database.config';
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard';
/**
 * FirebaseAuthGuard에서 @InjectRepository(User) 사용 (SEC-3: 정지 상태 실시간 DB 조회)
 * → app.module.ts 레벨에서 User 엔티티 레포지토리를 제공해야 주입 가능
 */
import { User } from './modules/users/entities/user.entity';

/** ===== 기능 모듈 임포트 ===== */
import { AuthModule } from './modules/auth/auth.module';           // 인증 (JWT 기반 로그인/회원가입/소셜 로그인)
import { UsersModule } from './modules/users/users.module';        // 사용자 프로필 관리
import { UserBoardsModule } from './modules/user-boards/user-boards.module'; // 내 보드 등록 (1 user → N boards)
import { DiaryInteractionsModule } from './modules/diary-interactions/diary-interactions.module'; // 다이어리 댓글 + 도움됐어요
import { SpotsModule } from './modules/spots/spots.module';        // 서핑 스팟 (해변 위치) 관리
import { ForecastsModule } from './modules/forecasts/forecasts.module'; // 파도/날씨 예보
import { DiaryModule } from './modules/diary/diary.module';        // 서핑 다이어리 (일지) 기록
import { CommunityModule } from './modules/community/community.module'; // 커뮤니티 (게시판, 댓글, 좋아요, 북마크)
import { QnAModule } from './modules/qna/qna.module';              // Q&A 질문/답변
import { GuidesModule } from './modules/guides/guides.module';     // 서핑 가이드 (교육 콘텐츠)
import { NotificationsModule } from './modules/notifications/notifications.module'; // 푸시 알림 (FCM)
import { UploadModule } from './modules/upload/upload.module';     // 파일 업로드 (AWS S3 Presigned URL)
import { TermsModule } from './modules/terms/terms.module';        // 이용약관 관리 및 동의
import { AdminModule } from './modules/admin/admin.module';        // 관리자 기능 (스팟/가이드 관리, 사용자 제재, 신고 처리)
import { DashboardModule } from './modules/dashboard/dashboard.module'; // 대시보드 (공개 예보 현황)
import { KhoaModule } from './modules/khoa/khoa.module';          // KHOA 서핑지수 (해양수산부 국립해양조사원)
import { WeatherAlertModule } from './modules/weather-alert/weather-alert.module'; // 기상청 기상특보 (풍랑/강풍/태풍)
import { BadgesModule } from './modules/badges/badges.module';    // 뱃지/업적 시스템

/**
 * @class AppModule
 * @description 애플리케이션 루트 모듈
 *
 * NestJS의 모듈 시스템 최상위에 위치하며, 모든 하위 모듈을 imports 배열에 등록합니다.
 * 이 모듈이 로드되면 모든 하위 모듈의 컨트롤러, 서비스, 프로바이더가 함께 초기화됩니다.
 */
@Module({
  imports: [
    /**
     * ConfigModule - 환경 변수 글로벌 설정
     * - isGlobal: true → 모든 모듈에서 ConfigService를 별도 import 없이 사용 가능
     * - envFilePath → .env 파일을 우선 로드, 없으면 .env.example 사용
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    /**
     * TypeOrmModule - PostgreSQL 데이터베이스 연결
     * - forRootAsync → 환경 변수 로드 후 비동기적으로 DB 연결 설정
     * - getDatabaseConfig 팩토리 함수에서 호스트, 포트, 인증 정보 등을 구성
     */
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    /**
     * User 엔티티 레포지토리 — 글로벌 가드(FirebaseAuthGuard)에서 주입 필요 (SEC-3)
     * FirebaseAuthGuard는 app.module.ts의 providers에 글로벌로 등록되므로
     * 이 모듈에서 forFeature([User])를 선언해야 @InjectRepository(User)가 동작
     */
    TypeOrmModule.forFeature([User]),

    /**
     * ScheduleModule - 크론/인터벌 기반 작업 스케줄링
     * 예: 파도 예보 데이터 주기적 갱신, 오래된 알림 정리 등
     */
    ScheduleModule.forRoot(),

    /**
     * ThrottlerModule - API 요청 속도 제한 (Rate Limiting)
     * - 브루트포스 공격 방지 (로그인 시도 제한)
     * - DDoS 완화 (과도한 요청 차단)
     * - 기본: 60초당 20회 요청 허용 (IP 기준)
     */
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,   // 60초 윈도우
          limit: 20,    // 윈도우당 최대 20회 요청
        },
      ],
    }),

    /** ===== 기능 모듈 등록 ===== */
    AuthModule,           // 인증 모듈: JWT 기반 로그인/회원가입, Google/Kakao 소셜 로그인 (JwtModule 글로벌 가드에 제공)
    UsersModule,          // 사용자 모듈: 프로필 CRUD, FCM 토큰 관리
    UserBoardsModule,     // 내 보드 모듈: 사용자 1:N 보드 등록/관리 (다이어리 작성 시 보드 선택)
    DiaryInteractionsModule, // 다이어리 댓글 + 도움됐어요 (Phase 2 — 소통 탭 제거 + 다이어리 강화)
    SpotsModule,          // 서핑 스팟 모듈: 해변 목록, 즐겨찾기, 투표
    ForecastsModule,      // 예보 모듈: Open-Meteo API 기반 파도/날씨 데이터
    DiaryModule,          // 다이어리 모듈: 서핑 일지 작성/조회/수정/삭제
    CommunityModule,      // 커뮤니티 모듈: 게시글, 댓글, 좋아요, 북마크, 신고
    QnAModule,            // Q&A 모듈: 서핑 관련 질문/답변
    GuidesModule,         // 가이드 모듈: 서핑 교육 콘텐츠 및 학습 진행도
    NotificationsModule,  // 알림 모듈: 푸시 알림, 파도 조건 알림 설정
    UploadModule,         // 업로드 모듈: S3 Presigned URL 발급
    TermsModule,          // 약관 모듈: 이용약관 조회 및 동의 처리
    AdminModule,          // 관리자 모듈: 관리자 전용 CRUD, 사용자 제재
    DashboardModule,      // 대시보드 모듈: 공개 예보 현황 조회
    KhoaModule,           // KHOA 서핑지수 모듈: 해양수산부 연안 파도 데이터 보강 (한국 스팟 전용)
    WeatherAlertModule,   // 기상청 기상특보 모듈: 풍랑/강풍/태풍 특보 실시간 조회 (15분 갱신)
    BadgesModule,         // 뱃지 모듈: 서핑 업적 59개 자동 수여 시스템
  ],
  controllers: [],
  providers: [
    /**
     * 글로벌 JWT 인증 가드 등록
     * APP_GUARD로 등록하면 모든 컨트롤러의 모든 엔드포인트에 자동 적용
     * @Public() 데코레이터가 붙은 엔드포인트만 인증 없이 접근 가능
     * FirebaseAuthGuard는 이름만 Firebase이고, 실제로는 JWT 검증 수행
     * (기존 Firebase 인증에서 자체 JWT 인증으로 전환됨)
     */
    /**
     * 글로벌 JWT 인증 가드
     * @Public() 데코레이터가 붙은 엔드포인트만 인증 없이 접근 가능
     */
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
    /**
     * 글로벌 Rate Limiting 가드
     * 모든 엔드포인트에 요청 속도 제한 적용 (60초당 20회)
     * 인증 엔드포인트는 @Throttle()으로 더 엄격하게 제한 가능
     */
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
