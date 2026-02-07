/**
 * @file firebase.config.ts
 * @description Firebase Admin SDK 설정 및 프로바이더
 *
 * Firebase Admin SDK를 초기화하여 다음 기능들에 활용합니다:
 * - 사용자 인증: Firebase ID 토큰 검증 (FirebaseAuthGuard에서 사용)
 * - 푸시 알림: FCM(Firebase Cloud Messaging)을 통한 모바일 푸시 알림 전송
 *
 * 환경 변수:
 * - FIREBASE_PROJECT_ID: Firebase 프로젝트 ID
 * - FIREBASE_CLIENT_EMAIL: Firebase 서비스 계정 이메일
 * - FIREBASE_PRIVATE_KEY: Firebase 서비스 계정 비공개 키 (줄바꿈 문자 \\n 포함 가능)
 *
 * 자격 증명이 없으면 null을 반환하여 개발 환경에서도 에러 없이 실행 가능합니다.
 */

import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/** Firebase Admin DI 토큰 - @Inject(FIREBASE_ADMIN)으로 주입받을 때 사용 */
export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

/** Firebase 설정 인터페이스 - 서비스 계정 인증 정보 */
export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** 환경 변수에서 Firebase 설정값을 읽어오는 팩토리 함수 (privateKey의 \\n → 실제 줄바꿈으로 변환) */
export const getFirebaseConfig = (
  configService: ConfigService,
): FirebaseConfig => {
  return {
    projectId: configService.get<string>('FIREBASE_PROJECT_ID', ''),
    clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL', ''),
    privateKey: (
      configService.get<string>('FIREBASE_PRIVATE_KEY', '') || ''
    ).replace(/\\n/g, '\n'),
  };
};

/**
 * Firebase Admin SDK 프로바이더 - NestJS DI에 Firebase Admin App을 등록
 * 이미 초기화된 경우 기존 인스턴스를 재사용합니다 (중복 초기화 방지).
 * 자격 증명이 없으면 null을 반환합니다.
 */
export const FirebaseProvider: Provider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): admin.app.App | null => {
    const logger = new Logger('FirebaseConfig');
    const config = getFirebaseConfig(configService);

    if (!config.projectId || !config.clientEmail || !config.privateKey) {
      logger.warn(
        'Firebase credentials not configured. Firebase services will be unavailable.',
      );
      return null;
    }

    try {
      // Prevent re-initialization if already initialized
      if (admin.apps.length > 0) {
        logger.log('Firebase Admin SDK already initialized');
        return admin.app();
      }

      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      });

      logger.log(
        `Firebase Admin SDK initialized for project: ${config.projectId}`,
      );
      return app;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to initialize Firebase Admin SDK: ${message}`);
      return null;
    }
  },
};
