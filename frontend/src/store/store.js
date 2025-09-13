import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import punchSlice from './slices/punchSlice';
import userSlice from './slices/userSlice';
import geofenceSlice from './slices/geofenceSlice';
import departmentSlice from './slices/departmentSlice';
import reportSlice from './slices/reportSlice';
import settingsSlice from './slices/settingsSlice';
import uiSlice from './slices/uiSlice';

// Configure the Redux store
export const store = configureStore({
  reducer: {
    auth: authSlice,
    punch: punchSlice,
    user: userSlice,
    geofence: geofenceSlice,
    department: departmentSlice,
    report: reportSlice,
    settings: settingsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export types for TypeScript (if needed in the future)
// Note: These are commented out since this is a .js file, not .ts
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

// For JavaScript, we can export the store's getState and dispatch
export const getRootState = () => store.getState();
export const getAppDispatch = () => store.dispatch;

// Hot module replacement for development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./slices/authSlice', () => {
    store.replaceReducer({
      auth: require('./slices/authSlice').default,
      punch: punchSlice,
      user: userSlice,
      geofence: geofenceSlice,
      department: departmentSlice,
      report: reportSlice,
      settings: settingsSlice,
      ui: uiSlice,
    });
  });
}

export default store;