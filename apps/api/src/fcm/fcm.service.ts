import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private fcmApp: admin.app.App | null = null;
  private isInitialized = false;

  onModuleInit() {
    const fcmKey = process.env.FCM_KEY;

    if (!fcmKey) {
      this.logger.warn('FCM_KEY not set. Push notifications disabled.');
      return;
    }

    try {
      // FCM_KEY should be a base64-encoded service account JSON
      const serviceAccount = JSON.parse(Buffer.from(fcmKey, 'base64').toString('utf-8'));

      this.fcmApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.isInitialized = true;
      this.logger.log('✅ Firebase Admin initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize Firebase Admin:', error?.message || error);
    }
  }

  async sendPushNotification(token: string, title: string, body: string): Promise<void> {
    if (!this.isInitialized || !this.fcmApp) {
      this.logger.debug(`FCM not initialized. Skipping push to token ${token.substring(0, 20)}...`);
      return;
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        token,
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`📲 Push notification sent successfully: ${response}`);
    } catch (error: any) {
      // Token might be invalid or expired
      if (error?.code === 'messaging/invalid-registration-token' || 
          error?.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`Invalid/expired FCM token: ${token.substring(0, 20)}...`);
      } else {
        this.logger.error(`Failed to send push notification: ${error?.message || error}`);
      }
    }
  }
}

