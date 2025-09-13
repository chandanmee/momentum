import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  theme: 'light', // 'light' | 'dark' | 'auto'
  sidebarOpen: false,
  mobileMenuOpen: false,
  notifications: [],
  snackbars: [],
  modals: {
    punchModal: false,
    profileModal: false,
    settingsModal: false,
    confirmDialog: false,
    userFormModal: false,
    geofenceFormModal: false,
    departmentFormModal: false,
  },
  loading: {
    global: false,
    page: false,
    component: {},
  },
  errors: {
    global: null,
    page: null,
    component: {},
  },
  confirmDialog: {
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    severity: 'warning', // 'info' | 'warning' | 'error' | 'success'
  },
  breadcrumbs: [],
  pageTitle: 'Momentum',
  searchQuery: '',
  filters: {
    dateRange: {
      startDate: null,
      endDate: null,
    },
    quickFilter: 'all', // 'all' | 'today' | 'week' | 'month'
  },
  preferences: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h', // '12h' | '24h'
    currency: 'USD',
    notifications: {
      email: true,
      push: true,
      desktop: true,
      sound: true,
    },
    dashboard: {
      refreshInterval: 30000, // 30 seconds
      autoRefresh: true,
      compactView: false,
    },
  },
  connectivity: {
    online: navigator.onLine,
    lastOnline: Date.now(),
    syncPending: false,
  },
  geolocation: {
    enabled: false,
    permission: 'prompt', // 'granted' | 'denied' | 'prompt'
    accuracy: null,
    lastUpdate: null,
    coordinates: null,
  },
  app: {
    version: process.env.REACT_APP_VERSION || '1.0.0',
    buildDate: process.env.REACT_APP_BUILD_DATE || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    installPrompt: null,
    isInstalled: false,
    updateAvailable: false,
  },
};

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

const createNotification = (type, message, options = {}) => ({
  id: generateId(),
  type, // 'info' | 'success' | 'warning' | 'error'
  message,
  timestamp: Date.now(),
  read: false,
  persistent: options.persistent || false,
  action: options.action || null,
  autoHide: options.autoHide !== false,
  duration: options.duration || (type === 'error' ? 8000 : 4000),
});

const createSnackbar = (type, message, options = {}) => ({
  id: generateId(),
  type, // 'info' | 'success' | 'warning' | 'error'
  message,
  timestamp: Date.now(),
  autoHide: options.autoHide !== false,
  duration: options.duration || 4000,
  action: options.action || null,
});

// UI slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
    
    // Sidebar and Navigation
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action) => {
      state.mobileMenuOpen = action.payload;
    },
    
    // Notifications
    addNotification: (state, action) => {
      const { type, message, options } = action.payload;
      const notification = createNotification(type, message, options);
      state.notifications.unshift(notification);
      
      // Limit notifications to 50
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find(
        notification => notification.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Snackbars
    addSnackbar: (state, action) => {
      const { type, message, options } = action.payload;
      const snackbar = createSnackbar(type, message, options);
      state.snackbars.push(snackbar);
    },
    removeSnackbar: (state, action) => {
      state.snackbars = state.snackbars.filter(
        snackbar => snackbar.id !== action.payload
      );
    },
    clearSnackbars: (state) => {
      state.snackbars = [];
    },
    
    // Modals
    openModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals.hasOwnProperty(modalName)) {
        state.modals[modalName] = true;
      }
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals.hasOwnProperty(modalName)) {
        state.modals[modalName] = false;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modalName => {
        state.modals[modalName] = false;
      });
    },
    
    // Loading States
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setPageLoading: (state, action) => {
      state.loading.page = action.payload;
    },
    setComponentLoading: (state, action) => {
      const { component, loading } = action.payload;
      state.loading.component[component] = loading;
    },
    clearComponentLoading: (state, action) => {
      const component = action.payload;
      delete state.loading.component[component];
    },
    
    // Error States
    setGlobalError: (state, action) => {
      state.errors.global = action.payload;
    },
    setPageError: (state, action) => {
      state.errors.page = action.payload;
    },
    setComponentError: (state, action) => {
      const { component, error } = action.payload;
      state.errors.component[component] = error;
    },
    clearGlobalError: (state) => {
      state.errors.global = null;
    },
    clearPageError: (state) => {
      state.errors.page = null;
    },
    clearComponentError: (state, action) => {
      const component = action.payload;
      delete state.errors.component[component];
    },
    clearAllErrors: (state) => {
      state.errors.global = null;
      state.errors.page = null;
      state.errors.component = {};
    },
    
    // Confirm Dialog
    openConfirmDialog: (state, action) => {
      const { title, message, onConfirm, onCancel, confirmText, cancelText, severity } = action.payload;
      state.confirmDialog = {
        open: true,
        title: title || 'Confirm Action',
        message: message || 'Are you sure you want to proceed?',
        onConfirm,
        onCancel,
        confirmText: confirmText || 'Confirm',
        cancelText: cancelText || 'Cancel',
        severity: severity || 'warning',
      };
    },
    closeConfirmDialog: (state) => {
      state.confirmDialog = {
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        severity: 'warning',
      };
    },
    
    // Breadcrumbs and Page Title
    setBreadcrumbs: (state, action) => {
      state.breadcrumbs = action.payload;
    },
    setPageTitle: (state, action) => {
      state.pageTitle = action.payload;
      document.title = `${action.payload} - Momentum`;
    },
    
    // Search and Filters
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setDateRange: (state, action) => {
      state.filters.dateRange = action.payload;
    },
    setQuickFilter: (state, action) => {
      state.filters.quickFilter = action.payload;
      
      // Auto-set date range based on quick filter
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (action.payload) {
        case 'today':
          state.filters.dateRange = {
            startDate: today.toISOString(),
            endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
          };
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          state.filters.dateRange = {
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString(),
          };
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          state.filters.dateRange = {
            startDate: monthStart.toISOString(),
            endDate: monthEnd.toISOString(),
          };
          break;
        default:
          state.filters.dateRange = {
            startDate: null,
            endDate: null,
          };
      }
    },
    
    // Preferences
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
      localStorage.setItem('preferences', JSON.stringify(state.preferences));
    },
    resetPreferences: (state) => {
      state.preferences = initialState.preferences;
      localStorage.removeItem('preferences');
    },
    
    // Connectivity
    setOnlineStatus: (state, action) => {
      state.connectivity.online = action.payload;
      if (action.payload) {
        state.connectivity.lastOnline = Date.now();
      }
    },
    setSyncPending: (state, action) => {
      state.connectivity.syncPending = action.payload;
    },
    
    // Geolocation
    setGeolocationEnabled: (state, action) => {
      state.geolocation.enabled = action.payload;
    },
    setGeolocationPermission: (state, action) => {
      state.geolocation.permission = action.payload;
    },
    updateGeolocation: (state, action) => {
      const { coordinates, accuracy } = action.payload;
      state.geolocation.coordinates = coordinates;
      state.geolocation.accuracy = accuracy;
      state.geolocation.lastUpdate = Date.now();
    },
    
    // App State
    setInstallPrompt: (state, action) => {
      state.app.installPrompt = action.payload;
    },
    setAppInstalled: (state, action) => {
      state.app.isInstalled = action.payload;
    },
    setUpdateAvailable: (state, action) => {
      state.app.updateAvailable = action.payload;
    },
    
    // Reset UI State
    resetUIState: (state) => {
      // Keep theme and preferences
      const { theme, preferences } = state;
      return {
        ...initialState,
        theme,
        preferences,
      };
    },
  },
});

// Export actions
export const {
  // Theme
  setTheme,
  toggleTheme,
  
  // Sidebar and Navigation
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  
  // Notifications
  addNotification,
  removeNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications,
  
  // Snackbars
  addSnackbar,
  removeSnackbar,
  clearSnackbars,
  
  // Modals
  openModal,
  closeModal,
  closeAllModals,
  
  // Loading States
  setGlobalLoading,
  setPageLoading,
  setComponentLoading,
  clearComponentLoading,
  
  // Error States
  setGlobalError,
  setPageError,
  setComponentError,
  clearGlobalError,
  clearPageError,
  clearComponentError,
  clearAllErrors,
  
  // Confirm Dialog
  openConfirmDialog,
  closeConfirmDialog,
  
  // Breadcrumbs and Page Title
  setBreadcrumbs,
  setPageTitle,
  
  // Search and Filters
  setSearchQuery,
  setDateRange,
  setQuickFilter,
  
  // Preferences
  updatePreferences,
  resetPreferences,
  
  // Connectivity
  setOnlineStatus,
  setSyncPending,
  
  // Geolocation
  setGeolocationEnabled,
  setGeolocationPermission,
  updateGeolocation,
  
  // App State
  setInstallPrompt,
  setAppInstalled,
  setUpdateAvailable,
  
  // Reset
  resetUIState,
} = uiSlice.actions;

// Thunk actions for complex operations
export const showNotification = (type, message, options = {}) => (dispatch) => {
  dispatch(addNotification({ type, message, options }));
  
  // Auto-remove notification if not persistent
  if (!options.persistent && options.autoHide !== false) {
    const duration = options.duration || (type === 'error' ? 8000 : 4000);
    setTimeout(() => {
      // Note: In a real app, you'd need to track the notification ID
      // This is a simplified version
    }, duration);
  }
};

export const showSnackbar = (type, message, options = {}) => (dispatch) => {
  const snackbar = createSnackbar(type, message, options);
  dispatch(addSnackbar({ type, message, options }));
  
  // Auto-remove snackbar
  if (options.autoHide !== false) {
    const duration = options.duration || 4000;
    setTimeout(() => {
      dispatch(removeSnackbar(snackbar.id));
    }, duration);
  }
  
  return snackbar.id;
};

export const initializeUI = () => (dispatch) => {
  // Load theme from localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
    dispatch(setTheme(savedTheme));
  }
  
  // Load preferences from localStorage
  const savedPreferences = localStorage.getItem('preferences');
  if (savedPreferences) {
    try {
      const preferences = JSON.parse(savedPreferences);
      dispatch(updatePreferences(preferences));
    } catch (error) {
      console.warn('Failed to parse saved preferences:', error);
    }
  }
  
  // Set up online/offline listeners
  const handleOnline = () => dispatch(setOnlineStatus(true));
  const handleOffline = () => dispatch(setOnlineStatus(false));
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial online status
  dispatch(setOnlineStatus(navigator.onLine));
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Selectors
export const selectUI = (state) => state.ui;
export const selectTheme = (state) => state.ui.theme;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectMobileMenuOpen = (state) => state.ui.mobileMenuOpen;
export const selectNotifications = (state) => state.ui.notifications;
export const selectUnreadNotifications = (state) => 
  state.ui.notifications.filter(notification => !notification.read);
export const selectSnackbars = (state) => state.ui.snackbars;
export const selectModals = (state) => state.ui.modals;
export const selectLoading = (state) => state.ui.loading;
export const selectErrors = (state) => state.ui.errors;
export const selectConfirmDialog = (state) => state.ui.confirmDialog;
export const selectBreadcrumbs = (state) => state.ui.breadcrumbs;
export const selectPageTitle = (state) => state.ui.pageTitle;
export const selectSearchQuery = (state) => state.ui.searchQuery;
export const selectFilters = (state) => state.ui.filters;
export const selectPreferences = (state) => state.ui.preferences;
export const selectConnectivity = (state) => state.ui.connectivity;
export const selectGeolocation = (state) => state.ui.geolocation;
export const selectApp = (state) => state.ui.app;
export const selectIsOnline = (state) => state.ui.connectivity.online;
export const selectIsLoading = (component) => (state) => 
  state.ui.loading.global || state.ui.loading.page || state.ui.loading.component[component] || false;
export const selectHasError = (component) => (state) => 
  state.ui.errors.global || state.ui.errors.page || state.ui.errors.component[component] || null;

export default uiSlice.reducer;