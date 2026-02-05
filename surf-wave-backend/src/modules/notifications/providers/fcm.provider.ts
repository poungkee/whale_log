import { Injectable, Inject, Logger } from '@nestjs/common';
import { FIREBASE_ADMIN } from '../../../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmProvider {
  private readonly logger = new Logger(FcmProvider.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private firebaseAdmin: admin.app.App | null,
  ) {}

  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized, skipping push notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await this.firebaseAdmin.messaging().send(message);
      this.logger.log(`Push notification sent to ${fcmToken.substring(0, 20)}...`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      return false;
    }
  }

  async sendToMultipleDevices(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.firebaseAdmin || fcmTokens.length === 0) {
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title,
          body,
        },
        data,
      };

      const response = await this.firebaseAdmin.messaging().sendEachForMulticast(message);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error(`Failed to send multicast: ${error.message}`);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }
}
