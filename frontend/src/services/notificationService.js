class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'unsupported';
    this.serviceWorkerRegistration = null;
    this.vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    this.subscriptionEndpoint = '/api/notifications/subscribe';
    this.callbacks = {
      click: [],
      close: [],
      error: [],
      show: [],
    };
  }

  // Initialize the service
  async initialize() {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    try {
      // Get service worker registration for push notifications
      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      }

      // Update permission status
      this.permission = Notification.permission;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Show a simple notification
  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return null;
    }

    try {
      const defaultOptions = {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'momentum-notification',
        renotify: false,
        requireInteraction: false,
        silent: false,
        ...options,
      };

      let notification;

      // Use service worker for better control if available
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.showNotification(title, defaultOptions);
        // Get the notification from service worker
        const notifications = await this.serviceWorkerRegistration.getNotifications({
          tag: defaultOptions.tag,
        });
        notification = notifications[0];
      } else {
        notification = new Notification(title, defaultOptions);
      }

      if (notification) {
        // Add event listeners
        notification.onclick = (event) => {
          this.callbacks.click.forEach(callback => {
            try {
              callback(event, notification);
            } catch (error) {
              console.error('Error in notification click callback:', error);
            }
          });
        };

        notification.onclose = (event) => {
          this.callbacks.close.forEach(callback => {
            try {
              callback(event, notification);
            } catch (error) {
              console.error('Error in notification close callback:', error);
            }
          });
        };

        notification.onerror = (event) => {
          this.callbacks.error.forEach(callback => {
            try {
              callback(event, notification);
            } catch (error) {
              console.error('Error in notification error callback:', error);
            }
          });
        };

        notification.onshow = (event) => {
          this.callbacks.show.forEach(callback => {
            try {
              callback(event, notification);
            } catch (error) {
              console.error('Error in notification show callback:', error);
            }
          });
        };

        // Auto-close after specified duration
        if (options.autoClose && options.duration) {
          setTimeout(() => {
            notification.close();
          }, options.duration);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  // Show different types of notifications
  async showSuccessNotification(message, options = {}) {
    return this.showNotification('Success', {
      body: message,
      icon: '/icons/success.png',
      tag: 'success',
      ...options,
    });
  }

  async showErrorNotification(message, options = {}) {
    return this.showNotification('Error', {
      body: message,
      icon: '/icons/error.png',
      tag: 'error',
      requireInteraction: true,
      ...options,
    });
  }

  async showWarningNotification(message, options = {}) {
    return this.showNotification('Warning', {
      body: message,
      icon: '/icons/warning.png',
      tag: 'warning',
      ...options,
    });
  }

  async showInfoNotification(message, options = {}) {
    return this.showNotification('Information', {
      body: message,
      icon: '/icons/info.png',
      tag: 'info',
      ...options,
    });
  }

  // Show punch-related notifications
  async showPunchNotification(type, data = {}) {
    const notifications = {
      'punch-in': {
        title: 'Punched In',
        body: `Successfully punched in at ${data.time || 'now'}`,
        icon: '/icons/punch-in.png',
        tag: 'punch-in',
      },
      'punch-out': {
        title: 'Punched Out',
        body: `Successfully punched out at ${data.time || 'now'}`,
        icon: '/icons/punch-out.png',
        tag: 'punch-out',
      },
      'location-warning': {
        title: 'Location Warning',
        body: 'You are outside the designated work area',
        icon: '/icons/location-warning.png',
        tag: 'location-warning',
        requireInteraction: true,
      },
      'reminder': {
        title: 'Punch Reminder',
        body: data.message || 'Don\'t forget to punch in/out',
        icon: '/icons/reminder.png',
        tag: 'reminder',
      },
    };

    const config = notifications[type];
    if (!config) {
      console.warn(`Unknown punch notification type: ${type}`);
      return null;
    }

    return this.showNotification(config.title, {
      ...config,
      data: { type, ...data },
    });
  }

  // Push notification subscription
  async subscribeToPushNotifications() {
    if (!this.serviceWorkerRegistration || !this.vapidPublicKey) {
      console.warn('Push notifications not available: missing service worker or VAPID key');
      return null;
    }

    try {
      // Check if already subscribed
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPushNotifications() {
    if (!this.serviceWorkerRegistration) {
      return false;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (subscription) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(subscription);
        
        // Unsubscribe locally
        await subscription.unsubscribe();
      }
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(this.subscriptionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('momentum_token')}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(subscription) {
    try {
      const response = await fetch(this.subscriptionEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('momentum_token')}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing subscription from server:', error);
      throw error;
    }
  }

  // Get all active notifications
  async getActiveNotifications() {
    if (!this.serviceWorkerRegistration) {
      return [];
    }

    try {
      return await this.serviceWorkerRegistration.getNotifications();
    } catch (error) {
      console.error('Error getting active notifications:', error);
      return [];
    }
  }

  // Close all notifications
  async closeAllNotifications() {
    try {
      const notifications = await this.getActiveNotifications();
      notifications.forEach(notification => notification.close());
      return true;
    } catch (error) {
      console.error('Error closing notifications:', error);
      return false;
    }
  }

  // Close notifications by tag
  async closeNotificationsByTag(tag) {
    try {
      const notifications = await this.getActiveNotifications();
      notifications
        .filter(notification => notification.tag === tag)
        .forEach(notification => notification.close());
      return true;
    } catch (error) {
      console.error('Error closing notifications by tag:', error);
      return false;
    }
  }

  // Event listeners
  addEventListener(type, callback) {
    if (this.callbacks[type]) {
      this.callbacks[type].push(callback);
    }
  }

  removeEventListener(type, callback) {
    if (this.callbacks[type]) {
      const index = this.callbacks[type].indexOf(callback);
      if (index > -1) {
        this.callbacks[type].splice(index, 1);
      }
    }
  }

  // Utility functions
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if push notifications are supported
  isPushSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Get notification permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Check if notifications are enabled
  areNotificationsEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  // Schedule a notification (using setTimeout)
  scheduleNotification(title, options = {}, delay = 0) {
    return setTimeout(() => {
      this.showNotification(title, options);
    }, delay);
  }

  // Cancel a scheduled notification
  cancelScheduledNotification(timeoutId) {
    clearTimeout(timeoutId);
  }

  // Test notification
  async testNotification() {
    return this.showNotification('Test Notification', {
      body: 'This is a test notification from Momentum',
      tag: 'test',
      autoClose: true,
      duration: 5000,
    });
  }

  // Cleanup
  destroy() {
    this.callbacks.click = [];
    this.callbacks.close = [];
    this.callbacks.error = [];
    this.callbacks.show = [];
  }
}

// Create and export a singleton instance
const notificationService = new NotificationService();
export default notificationService;

// Also export the class for testing purposes
export { NotificationService };