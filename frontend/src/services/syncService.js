import api from './api';
import storageService from './storageService';
import { store } from '../store/store';
import { setOnlineStatus, setSyncPending, addNotification } from '../store/slices/uiSlice';

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncQueue = [];
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.maxRetryDelay = 30000; // 30 seconds
    this.syncInterval = null;
    this.autoSyncEnabled = true;
    this.autoSyncInterval = 30000; // 30 seconds
    
    // Bind event listeners
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    // Set up network listeners
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  // Initialize sync service
  async initialize() {
    try {
      await storageService.initialize();
      
      // Start auto-sync if online
      if (this.isOnline && this.autoSyncEnabled) {
        this.startAutoSync();
      }
      
      // Process any pending sync items
      await this.processPendingSyncItems();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      return false;
    }
  }

  // Network event handlers
  handleOnline() {
    console.log('Network connection restored');
    this.isOnline = true;
    store.dispatch(setOnlineStatus(true));
    
    // Start syncing when back online
    if (this.autoSyncEnabled) {
      this.startAutoSync();
      this.syncAll();
    }
  }

  handleOffline() {
    console.log('Network connection lost');
    this.isOnline = false;
    store.dispatch(setOnlineStatus(false));
    
    // Stop auto-sync when offline
    this.stopAutoSync();
  }

  // Auto-sync management
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAll();
      }
    }, this.autoSyncInterval);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Main sync methods
  async syncAll() {
    if (!this.isOnline || this.syncInProgress) {
      return false;
    }

    try {
      this.syncInProgress = true;
      store.dispatch(setSyncPending(true));
      
      console.log('Starting full sync...');
      
      // Sync in priority order
      await this.syncPunches();
      await this.syncUsers();
      await this.syncGeofences();
      await this.syncDepartments();
      await this.processPendingSyncItems();
      
      console.log('Full sync completed');
      
      store.dispatch(addNotification({
        type: 'success',
        message: 'Data synchronized successfully',
        options: { duration: 3000 }
      }));
      
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      
      store.dispatch(addNotification({
        type: 'error',
        message: 'Sync failed. Will retry automatically.',
        options: { duration: 5000 }
      }));
      
      return false;
    } finally {
      this.syncInProgress = false;
      store.dispatch(setSyncPending(false));
    }
  }

  // Sync punches
  async syncPunches() {
    try {
      // Upload unsynced punches
      const unsyncedPunches = await storageService.getUnsyncedPunches();
      
      for (const punch of unsyncedPunches) {
        try {
          const response = await api.post('/punches', {
            type: punch.type,
            timestamp: punch.timestamp,
            location: punch.location,
            notes: punch.notes,
            geofenceValidation: punch.geofenceValidation
          });
          
          // Mark as synced
          await storageService.markPunchAsSynced(punch.id);
          
          console.log(`Punch ${punch.id} synced successfully`);
        } catch (error) {
          console.error(`Failed to sync punch ${punch.id}:`, error);
          
          // Add to retry queue if not a permanent error
          if (error.response?.status !== 400) {
            await this.addToSyncQueue('punch', 'create', punch);
          }
        }
      }
      
      // Download recent punches for offline access
      const response = await api.get('/punches/recent');
      const recentPunches = response.data.punches;
      
      // Update local storage with server data
      for (const punch of recentPunches) {
        await storageService.update(storageService.stores.punches, {
          ...punch,
          synced: true,
          syncedAt: Date.now()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to sync punches:', error);
      throw error;
    }
  }

  // Sync users
  async syncUsers() {
    try {
      const response = await api.get('/users');
      const users = response.data.users;
      
      // Clear existing users and add fresh data
      await storageService.clear(storageService.stores.users);
      
      if (users.length > 0) {
        await storageService.bulkAdd(storageService.stores.users, users);
      }
      
      console.log(`Synced ${users.length} users`);
      return true;
    } catch (error) {
      console.error('Failed to sync users:', error);
      throw error;
    }
  }

  // Sync geofences
  async syncGeofences() {
    try {
      const response = await api.get('/geofences');
      const geofences = response.data.geofences;
      
      // Clear existing geofences and add fresh data
      await storageService.clear(storageService.stores.geofences);
      
      if (geofences.length > 0) {
        await storageService.bulkAdd(storageService.stores.geofences, geofences);
      }
      
      console.log(`Synced ${geofences.length} geofences`);
      return true;
    } catch (error) {
      console.error('Failed to sync geofences:', error);
      throw error;
    }
  }

  // Sync departments
  async syncDepartments() {
    try {
      const response = await api.get('/departments');
      const departments = response.data.departments;
      
      // Clear existing departments and add fresh data
      await storageService.clear(storageService.stores.departments);
      
      if (departments.length > 0) {
        await storageService.bulkAdd(storageService.stores.departments, departments);
      }
      
      console.log(`Synced ${departments.length} departments`);
      return true;
    } catch (error) {
      console.error('Failed to sync departments:', error);
      throw error;
    }
  }

  // Sync queue management
  async addToSyncQueue(type, action, data) {
    return storageService.addToSyncQueue(type, action, data);
  }

  async processPendingSyncItems() {
    try {
      const pendingItems = await storageService.getSyncQueue('pending');
      
      for (const item of pendingItems) {
        await this.processSyncItem(item);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to process pending sync items:', error);
      return false;
    }
  }

  async processSyncItem(item) {
    try {
      // Mark as syncing
      await storageService.updateSyncItem(item.id, {
        status: 'syncing',
        lastAttempt: Date.now(),
        attempts: item.attempts + 1
      });
      
      let success = false;
      
      // Process based on type and action
      switch (item.type) {
        case 'punch':
          success = await this.syncPunchItem(item);
          break;
        case 'user':
          success = await this.syncUserItem(item);
          break;
        case 'geofence':
          success = await this.syncGeofenceItem(item);
          break;
        case 'department':
          success = await this.syncDepartmentItem(item);
          break;
        default:
          console.warn(`Unknown sync item type: ${item.type}`);
      }
      
      if (success) {
        // Mark as completed
        await storageService.updateSyncItem(item.id, {
          status: 'completed',
          completedAt: Date.now()
        });
      } else {
        // Handle failure
        await this.handleSyncItemFailure(item);
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to process sync item ${item.id}:`, error);
      await this.handleSyncItemFailure(item, error.message);
      return false;
    }
  }

  async syncPunchItem(item) {
    try {
      switch (item.action) {
        case 'create':
          await api.post('/punches', item.data);
          break;
        case 'update':
          await api.put(`/punches/${item.data.id}`, item.data);
          break;
        case 'delete':
          await api.delete(`/punches/${item.data.id}`);
          break;
        default:
          throw new Error(`Unknown punch action: ${item.action}`);
      }
      return true;
    } catch (error) {
      console.error('Failed to sync punch item:', error);
      return false;
    }
  }

  async syncUserItem(item) {
    try {
      switch (item.action) {
        case 'create':
          await api.post('/users', item.data);
          break;
        case 'update':
          await api.put(`/users/${item.data.id}`, item.data);
          break;
        case 'delete':
          await api.delete(`/users/${item.data.id}`);
          break;
        default:
          throw new Error(`Unknown user action: ${item.action}`);
      }
      return true;
    } catch (error) {
      console.error('Failed to sync user item:', error);
      return false;
    }
  }

  async syncGeofenceItem(item) {
    try {
      switch (item.action) {
        case 'create':
          await api.post('/geofences', item.data);
          break;
        case 'update':
          await api.put(`/geofences/${item.data.id}`, item.data);
          break;
        case 'delete':
          await api.delete(`/geofences/${item.data.id}`);
          break;
        default:
          throw new Error(`Unknown geofence action: ${item.action}`);
      }
      return true;
    } catch (error) {
      console.error('Failed to sync geofence item:', error);
      return false;
    }
  }

  async syncDepartmentItem(item) {
    try {
      switch (item.action) {
        case 'create':
          await api.post('/departments', item.data);
          break;
        case 'update':
          await api.put(`/departments/${item.data.id}`, item.data);
          break;
        case 'delete':
          await api.delete(`/departments/${item.data.id}`);
          break;
        default:
          throw new Error(`Unknown department action: ${item.action}`);
      }
      return true;
    } catch (error) {
      console.error('Failed to sync department item:', error);
      return false;
    }
  }

  async handleSyncItemFailure(item, errorMessage = null) {
    const maxAttempts = this.retryAttempts;
    
    if (item.attempts >= maxAttempts) {
      // Mark as failed after max attempts
      await storageService.updateSyncItem(item.id, {
        status: 'failed',
        error: errorMessage || 'Max retry attempts exceeded',
        failedAt: Date.now()
      });
    } else {
      // Mark as pending for retry
      const delay = Math.min(
        this.retryDelay * Math.pow(2, item.attempts),
        this.maxRetryDelay
      );
      
      await storageService.updateSyncItem(item.id, {
        status: 'pending',
        error: errorMessage,
        nextRetry: Date.now() + delay
      });
    }
  }

  // Manual sync triggers
  async forceSyncPunches() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    return this.syncPunches();
  }

  async forceSyncAll() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    return this.syncAll();
  }

  // Conflict resolution
  async resolveConflicts() {
    try {
      const failedItems = await storageService.getSyncQueue('failed');
      
      for (const item of failedItems) {
        // Reset failed items to pending for retry
        await storageService.updateSyncItem(item.id, {
          status: 'pending',
          attempts: 0,
          error: null,
          nextRetry: null
        });
      }
      
      // Process the reset items
      await this.processPendingSyncItems();
      
      return true;
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      return false;
    }
  }

  // Utility methods
  async getSyncStatus() {
    const pendingItems = await storageService.getSyncQueue('pending');
    const syncingItems = await storageService.getSyncQueue('syncing');
    const failedItems = await storageService.getSyncQueue('failed');
    const completedItems = await storageService.getSyncQueue('completed');
    
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      autoSyncEnabled: this.autoSyncEnabled,
      pending: pendingItems.length,
      syncing: syncingItems.length,
      failed: failedItems.length,
      completed: completedItems.length,
      lastSync: await storageService.getSetting('lastSyncTime'),
    };
  }

  async getUnsyncedCount() {
    const unsyncedPunches = await storageService.getUnsyncedPunches();
    const pendingItems = await storageService.getSyncQueue('pending');
    
    return {
      punches: unsyncedPunches.length,
      other: pendingItems.length,
      total: unsyncedPunches.length + pendingItems.length
    };
  }

  // Settings
  setAutoSyncEnabled(enabled) {
    this.autoSyncEnabled = enabled;
    
    if (enabled && this.isOnline) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
    
    storageService.setSetting('autoSyncEnabled', enabled);
  }

  setAutoSyncInterval(interval) {
    this.autoSyncInterval = interval;
    
    if (this.autoSyncEnabled && this.isOnline) {
      this.startAutoSync(); // Restart with new interval
    }
    
    storageService.setSetting('autoSyncInterval', interval);
  }

  // Cleanup
  async clearSyncHistory() {
    await storageService.clearCompletedSyncItems();
    return true;
  }

  async resetSyncQueue() {
    await storageService.clear(storageService.stores.sync);
    return true;
  }

  // Destroy
  destroy() {
    this.stopAutoSync();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create and export a singleton instance
const syncService = new SyncService();
export default syncService;

// Also export the class for testing purposes
export { SyncService };

// Export sync utilities
export const syncUtils = {
  // Check if data needs sync
  needsSync: (lastSyncTime, maxAge = 300000) => { // 5 minutes default
    return !lastSyncTime || Date.now() - lastSyncTime > maxAge;
  },
  
  // Format sync status for display
  formatSyncStatus: (status) => {
    const statusMap = {
      pending: 'Pending',
      syncing: 'Syncing...',
      completed: 'Completed',
      failed: 'Failed'
    };
    return statusMap[status] || status;
  },
  
  // Calculate next retry time
  getNextRetryTime: (attempts, baseDelay = 1000, maxDelay = 30000) => {
    return Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  }
};