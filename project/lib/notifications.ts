import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const DISMISSED_NOTIFICATIONS_KEY = 'dismissed_notifications';

export interface NotificationData {
  id: string;
  type: 'alert' | 'reminder' | 'event';
  title: string;
  body: string;
  date: Date;
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Request notification permissions from the device
   */
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }
    
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Check if notifications are currently permitted by the device
   */
  static async getDevicePermissionStatus(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get the user's notification preference
   */
  static async getNotificationsEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      // Default to true if not set
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error getting notification preference:', error);
      return true;
    }
  }

  /**
   * Set the user's notification preference
   */
  static async setNotificationsEnabled(enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        // Request permission if enabling
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }
      
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled.toString());
      return true;
    } catch (error) {
      console.error('Error setting notification preference:', error);
      return false;
    }
  }

  /**
   * Schedule a local notification
   */
  static async scheduleNotification(notification: NotificationData): Promise<string | null> {
    // Check if notifications are enabled
    const enabled = await this.getNotificationsEnabled();
    if (!enabled) {
      console.log('Notifications are disabled by user');
      return null;
    }

    // Check device permissions
    const hasPermission = await this.getDevicePermissionStatus();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    // Don't schedule if in the past
    if (notification.date < new Date()) {
      console.log('Cannot schedule notification in the past');
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: true,
          data: {
            id: notification.id,
            type: notification.type,
            ...notification.data,
          },
        },
        trigger: notification.date as any,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Send an immediate notification (for alerts)
   */
  static async sendImmediateNotification(title: string, body: string, data?: Record<string, any>): Promise<string | null> {
    // Check if notifications are enabled
    const enabled = await this.getNotificationsEnabled();
    if (!enabled) {
      return null;
    }

    // Check device permissions
    const hasPermission = await this.getDevicePermissionStatus();
    if (!hasPermission) {
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data,
        },
        trigger: null, // null means send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Get dismissed notification IDs for a user
   */
  static async getDismissedNotifications(userId: string): Promise<Set<string>> {
    try {
      const key = `${DISMISSED_NOTIFICATIONS_KEY}_${userId}`;
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        // Clean up old dismissed notifications (older than 24 hours)
        const now = Date.now();
        const filtered = Object.entries(parsed)
          .filter(([_, timestamp]) => now - (timestamp as number) < 24 * 60 * 60 * 1000)
          .reduce((acc, [id, timestamp]) => ({ ...acc, [id]: timestamp }), {});
        
        return new Set(Object.keys(filtered));
      }
      return new Set();
    } catch (error) {
      console.error('Error getting dismissed notifications:', error);
      return new Set();
    }
  }

  /**
   * Dismiss a notification
   */
  static async dismissNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const key = `${DISMISSED_NOTIFICATIONS_KEY}_${userId}`;
      const value = await AsyncStorage.getItem(key);
      const dismissed = value ? JSON.parse(value) : {};
      dismissed[notificationId] = Date.now();
      await AsyncStorage.setItem(key, JSON.stringify(dismissed));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }

  /**
   * Clear dismissed notifications
   */
  static async clearDismissedNotifications(userId: string): Promise<void> {
    try {
      const key = `${DISMISSED_NOTIFICATIONS_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing dismissed notifications:', error);
    }
  }
}
