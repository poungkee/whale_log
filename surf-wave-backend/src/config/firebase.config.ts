import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

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
