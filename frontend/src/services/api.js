import axios from 'axios';
import { store } from '../store/store';
import { refreshAuthToken, logout } from '../store/slices/authSlice';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp
    config.metadata = { startTime: new Date() };
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`,
        {
          status: response.status,
          data: response.data,
        }
      );
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Calculate request duration
    const duration = originalRequest?.metadata 
      ? new Date() - originalRequest.metadata.startTime 
      : 0;
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} (${duration}ms)`,
        {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          data: error.response?.data,
        }
      );
    }
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await store.dispatch(refreshAuthToken()).unwrap();
          
          // Retry the original request with new token
          const newToken = localStorage.getItem('token');
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        console.warn('Token refresh failed, logging out user');
        store.dispatch(logout());
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout. Please check your connection and try again.';
      } else if (error.message === 'Network Error') {
        error.message = 'Network error. Please check your internet connection.';
      }
    }
    
    // Handle specific HTTP status codes
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          error.message = data?.message || 'Bad request. Please check your input.';
          break;
        case 403:
          error.message = data?.message || 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          error.message = data?.message || 'Resource not found.';
          break;
        case 409:
          error.message = data?.message || 'Conflict. The resource already exists.';
          break;
        case 422:
          error.message = data?.message || 'Validation error. Please check your input.';
          break;
        case 429:
          error.message = data?.message || 'Too many requests. Please try again later.';
          break;
        case 500:
          error.message = data?.message || 'Internal server error. Please try again later.';
          break;
        case 502:
          error.message = 'Bad gateway. The server is temporarily unavailable.';
          break;
        case 503:
          error.message = 'Service unavailable. Please try again later.';
          break;
        case 504:
          error.message = 'Gateway timeout. The server took too long to respond.';
          break;
        default:
          error.message = data?.message || `HTTP ${status}: ${error.message}`;
      }
    }
    
    return Promise.reject(error);
  }
);

// API methods
const apiMethods = {
  // Generic methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),
  
  // File upload method
  upload: (url, formData, onUploadProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  // Download method
  download: async (url, filename, config) => {
    try {
      const response = await api.get(url, {
        ...config,
        responseType: 'blob',
      });
      
      // Create blob link to download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      return response;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },
  
  // Health check method
  healthCheck: () => api.get('/health'),
  
  // Batch request method
  batch: async (requests) => {
    try {
      const promises = requests.map(({ method, url, data, config }) => {
        switch (method.toLowerCase()) {
          case 'get':
            return api.get(url, config);
          case 'post':
            return api.post(url, data, config);
          case 'put':
            return api.put(url, data, config);
          case 'patch':
            return api.patch(url, data, config);
          case 'delete':
            return api.delete(url, config);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      });
      
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => ({
        ...requests[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' ? result.reason : null,
      }));
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  },
};

// Request cancellation
export const createCancelToken = () => axios.CancelToken.source();
export const isCancel = axios.isCancel;

// Network status detection
export const isOnline = () => navigator.onLine;

// Request retry utility
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 408, 429
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (![408, 429].includes(error.response.status)) {
          throw error;
        }
      }
      
      // Don't retry on last attempt
      if (i === maxRetries) {
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError;
};

// Export the configured axios instance and methods
export default api;
export { apiMethods };