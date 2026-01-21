import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
// Platform is imported lazily if needed (currently not used in this file)
import {
  registerForPushNotificationsAsync,
  registerDeviceWithBackend,
  saveNotification,
  clearBadgeCount,
} from '../lib/notifications';

interface UseNotificationsProps {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void;
}

export function useNotifications({
  onNotificationReceived,
  onNotificationTapped,
}: UseNotificationsProps = {}) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setExpoPushToken(token);
          // Register with backend
          registerDeviceWithBackend(token)
            .then((success) => {
              if (success) {
                console.log('✅ Device registered with backend successfully');
              } else {
                console.log('⚠️ Device registration skipped (this is OK for development)');
              }
            })
            .catch((error) => {
              console.log('⚠️ Device registration error:', error.message);
            });
        } else {
          console.log('💡 Push notifications not available in current environment');
        }
      })
      .catch((error) => {
        console.log('⚠️ Push notification setup error:', error.message);
      });

    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received (foreground):', notification);
        setNotification(notification);

        // Save to local storage
        const { title, body, data } = notification.request.content;
        saveNotification(title || 'Notification', body || '', data);

        // Show in-app alert
        Alert.alert(
          title || '🔔 Notification',
          body || 'You have a new notification',
          [
            {
              text: 'Dismiss',
              style: 'cancel',
            },
            {
              text: 'View',
              onPress: () => {
                // Handle navigation based on data
                if (onNotificationReceived) {
                  onNotificationReceived(notification);
                }
              },
            },
          ]
        );
      }
    );

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        
        const { data } = response.notification.request.content;
        
        // Clear badge count when user interacts
        clearBadgeCount();

        // Handle navigation
        if (onNotificationTapped) {
          onNotificationTapped(response);
        } else {
          // Default handling based on notification data
          handleDefaultNavigation(data);
        }
      }
    );

    return () => {
      // Cleanup listeners
      try {
        if (notificationListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      } catch (error) {
        // In Expo Go, removeNotificationSubscription might not be available
        console.log('Note: Notification cleanup not available in Expo Go');
      }
    };
  }, [onNotificationReceived, onNotificationTapped]);

  return {
    expoPushToken,
    notification,
  };
}

/**
 * Default navigation handler based on notification data
 */
function handleDefaultNavigation(data: any) {
  console.log('Handling notification data:', data);
  
  // Extract relevant data
  const { type, invoiceId, tenantId } = data || {};

  // Navigate based on type
  switch (type) {
    case 'BEFORE_3_DAYS':
    case 'ON_DUE_DATE':
    case 'LATE':
    case 'CANCEL_WARNING':
      // Navigate to invoices screen
      // This will be handled by the navigation prop passed from App.tsx
      console.log(`Navigate to invoice ${invoiceId}`);
      break;
    default:
      console.log('Unknown notification type:', type);
  }
}

