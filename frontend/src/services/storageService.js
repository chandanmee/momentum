class StorageService {
  constructor() {
    this.dbName = 'MomentumDB';
    this.dbVersion = 1;
    this.db = null;
    this.isIndexedDBSupported = 'indexedDB' in window;
    this.stores = {
      punches: 'punches',
      users: 'users',
      geofences: 'geofences',
      departments: 'departments',
      reports: 'reports',
      settings: 'settings',
      cache: 'cache',
      sync: 'sync',
    };
  }

  // Initialize IndexedDB
  async initialize() {
    if (!this.isIndexedDBSupported) {
      console.warn('IndexedDB is not supported in this browser');
      return false;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createObjectStores(db);
      };
    });
  }

  // Create object stores
  createObjectStores(db) {
    // Punches store
    if (!db.objectStoreNames.contains(this.stores.punches)) {
      const punchStore = db.createObjectStore(this.stores.punches, {
        keyPath: 'id',
        autoIncrement: true,
      });
      punchStore.createIndex('userId', 'userId', { unique: false });
      punchStore.createIndex('timestamp', 'timestamp', { unique: false });
      punchStore.createIndex('type', 'type', { unique: false });
      punchStore.createIndex('synced', 'synced', { unique: false });
    }

    // Users store
    if (!db.objectStoreNames.contains(this.stores.users)) {
      const userStore = db.createObjectStore(this.stores.users, {
        keyPath: 'id',
      });
      userStore.createIndex('email', 'email', { unique: true });
      userStore.createIndex('role', 'role', { unique: false });
      userStore.createIndex('departmentId', 'departmentId', { unique: false });
    }

    // Geofences store
    if (!db.objectStoreNames.contains(this.stores.geofences)) {
      const geofenceStore = db.createObjectStore(this.stores.geofences, {
        keyPath: 'id',
      });
      geofenceStore.createIndex('name', 'name', { unique: false });
      geofenceStore.createIndex('type', 'type', { unique: false });
      geofenceStore.createIndex('active', 'active', { unique: false });
    }

    // Departments store
    if (!db.objectStoreNames.contains(this.stores.departments)) {
      const departmentStore = db.createObjectStore(this.stores.departments, {
        keyPath: 'id',
      });
      departmentStore.createIndex('name', 'name', { unique: false });
    }

    // Reports store
    if (!db.objectStoreNames.contains(this.stores.reports)) {
      const reportStore = db.createObjectStore(this.stores.reports, {
        keyPath: 'id',
        autoIncrement: true,
      });
      reportStore.createIndex('type', 'type', { unique: false });
      reportStore.createIndex('createdAt', 'createdAt', { unique: false });
      reportStore.createIndex('userId', 'userId', { unique: false });
    }

    // Settings store
    if (!db.objectStoreNames.contains(this.stores.settings)) {
      db.createObjectStore(this.stores.settings, {
        keyPath: 'key',
      });
    }

    // Cache store
    if (!db.objectStoreNames.contains(this.stores.cache)) {
      const cacheStore = db.createObjectStore(this.stores.cache, {
        keyPath: 'key',
      });
      cacheStore.createIndex('expiry', 'expiry', { unique: false });
    }

    // Sync store
    if (!db.objectStoreNames.contains(this.stores.sync)) {
      const syncStore = db.createObjectStore(this.stores.sync, {
        keyPath: 'id',
        autoIncrement: true,
      });
      syncStore.createIndex('type', 'type', { unique: false });
      syncStore.createIndex('status', 'status', { unique: false });
      syncStore.createIndex('createdAt', 'createdAt', { unique: false });
    }
  }

  // Generic CRUD operations
  async add(storeName, data) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName = null, query = null) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let source = store;
      if (indexName) {
        source = store.index(indexName);
      }
      
      const request = query ? source.getAll(query) : source.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName, data) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Punch-specific operations
  async savePunch(punchData) {
    const punch = {
      ...punchData,
      id: punchData.id || Date.now(),
      timestamp: punchData.timestamp || Date.now(),
      synced: false,
      createdAt: Date.now(),
    };

    return this.add(this.stores.punches, punch);
  }

  async getPunches(userId = null, limit = null) {
    let punches;
    
    if (userId) {
      punches = await this.getAll(this.stores.punches, 'userId', userId);
    } else {
      punches = await this.getAll(this.stores.punches);
    }

    // Sort by timestamp descending
    punches.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      punches = punches.slice(0, limit);
    }

    return punches;
  }

  async getUnsyncedPunches() {
    return this.getAll(this.stores.punches, 'synced', false);
  }

  async markPunchAsSynced(punchId) {
    const punch = await this.get(this.stores.punches, punchId);
    if (punch) {
      punch.synced = true;
      punch.syncedAt = Date.now();
      return this.update(this.stores.punches, punch);
    }
    return false;
  }

  // Cache operations
  async setCache(key, data, ttl = 3600000) { // 1 hour default TTL
    const cacheItem = {
      key,
      data,
      createdAt: Date.now(),
      expiry: Date.now() + ttl,
    };

    return this.update(this.stores.cache, cacheItem);
  }

  async getCache(key) {
    const cacheItem = await this.get(this.stores.cache, key);
    
    if (!cacheItem) {
      return null;
    }

    // Check if expired
    if (Date.now() > cacheItem.expiry) {
      await this.delete(this.stores.cache, key);
      return null;
    }

    return cacheItem.data;
  }

  async clearExpiredCache() {
    const allCache = await this.getAll(this.stores.cache);
    const now = Date.now();
    
    const expiredKeys = allCache
      .filter(item => now > item.expiry)
      .map(item => item.key);

    for (const key of expiredKeys) {
      await this.delete(this.stores.cache, key);
    }

    return expiredKeys.length;
  }

  // Settings operations
  async setSetting(key, value) {
    const setting = {
      key,
      value,
      updatedAt: Date.now(),
    };

    return this.update(this.stores.settings, setting);
  }

  async getSetting(key, defaultValue = null) {
    const setting = await this.get(this.stores.settings, key);
    return setting ? setting.value : defaultValue;
  }

  async deleteSetting(key) {
    return this.delete(this.stores.settings, key);
  }

  // Sync queue operations
  async addToSyncQueue(type, action, data) {
    const syncItem = {
      type, // 'punch', 'user', 'geofence', etc.
      action, // 'create', 'update', 'delete'
      data,
      status: 'pending', // 'pending', 'syncing', 'completed', 'failed'
      attempts: 0,
      createdAt: Date.now(),
      lastAttempt: null,
      error: null,
    };

    return this.add(this.stores.sync, syncItem);
  }

  async getSyncQueue(status = null) {
    if (status) {
      return this.getAll(this.stores.sync, 'status', status);
    }
    return this.getAll(this.stores.sync);
  }

  async updateSyncItem(id, updates) {
    const syncItem = await this.get(this.stores.sync, id);
    if (syncItem) {
      Object.assign(syncItem, updates, { updatedAt: Date.now() });
      return this.update(this.stores.sync, syncItem);
    }
    return false;
  }

  async removeSyncItem(id) {
    return this.delete(this.stores.sync, id);
  }

  async clearCompletedSyncItems() {
    const completedItems = await this.getAll(this.stores.sync, 'status', 'completed');
    
    for (const item of completedItems) {
      await this.delete(this.stores.sync, item.id);
    }

    return completedItems.length;
  }

  // Bulk operations
  async bulkAdd(storeName, items) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const results = [];
      let completed = 0;

      transaction.oncomplete = () => resolve(results);
      transaction.onerror = () => reject(transaction.error);

      items.forEach((item, index) => {
        const request = store.add(item);
        
        request.onsuccess = () => {
          results[index] = request.result;
          completed++;
        };
        
        request.onerror = () => {
          results[index] = { error: request.error };
          completed++;
        };
      });
    });
  }

  async bulkUpdate(storeName, items) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const results = [];
      let completed = 0;

      transaction.oncomplete = () => resolve(results);
      transaction.onerror = () => reject(transaction.error);

      items.forEach((item, index) => {
        const request = store.put(item);
        
        request.onsuccess = () => {
          results[index] = request.result;
          completed++;
        };
        
        request.onerror = () => {
          results[index] = { error: request.error };
          completed++;
        };
      });
    });
  }

  // Database maintenance
  async getStorageUsage() {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage,
        usagePercentage: (estimate.usage / estimate.quota) * 100,
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return null;
    }
  }

  async clearAllData() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeNames = Object.values(this.stores);
    
    for (const storeName of storeNames) {
      await this.clear(storeName);
    }

    return true;
  }

  async exportData() {
    const data = {};
    const storeNames = Object.values(this.stores);
    
    for (const storeName of storeNames) {
      data[storeName] = await this.getAll(storeName);
    }

    return {
      version: this.dbVersion,
      exportedAt: Date.now(),
      data,
    };
  }

  async importData(exportedData) {
    if (!exportedData.data) {
      throw new Error('Invalid export data format');
    }

    // Clear existing data
    await this.clearAllData();

    // Import data
    for (const [storeName, items] of Object.entries(exportedData.data)) {
      if (items.length > 0) {
        await this.bulkAdd(storeName, items);
      }
    }

    return true;
  }

  // Fallback to localStorage for unsupported browsers
  setLocalStorage(key, value) {
    try {
      localStorage.setItem(`momentum_${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error setting localStorage:', error);
      return false;
    }
  }

  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`momentum_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error getting localStorage:', error);
      return defaultValue;
    }
  }

  removeLocalStorage(key) {
    try {
      localStorage.removeItem(`momentum_${key}`);
      return true;
    } catch (error) {
      console.error('Error removing localStorage:', error);
      return false;
    }
  }

  // Cleanup
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create and export a singleton instance
const storageService = new StorageService();
export default storageService;

// Also export the class for testing purposes
export { StorageService };