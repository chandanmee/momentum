import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import punchSlice from './slices/punchSlice';
import userSlice from './slices/userSlice';
import departmentSlice from './slices/departmentSlice';
import reportSlice from './slices/reportSlice';
import settingsSlice from './slices/settingsSlice';
import geofenceSlice from './slices/geofenceSlice';

// Combine reducers
const rootReducer = combineReducers({
  auth: authSlice,
  ui: uiSlice,
  punch: punchSlice,
  user: userSlice,
  department: departmentSlice,
  report: reportSlice,
  settings: settingsSlice,
  geofence: geofenceSlice,
});

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'settings'], // Only persist auth and settings
  blacklist: ['ui'], // Don't persist UI state
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Export types for TypeScript (if needed)
// Note: These are commented out since this is a .js file, not .ts
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

// For JavaScript, we can export the store's getState and dispatch
export const getRootState = () => store.getState();
export const getAppDispatch = () => store.dispatch;

export default store;