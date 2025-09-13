import api from './api';

class AuthService {
  constructor() {
    this.tokenKey = 'momentum_token';
    this.refreshTokenKey = 'momentum_refresh_token';
    this.userKey = 'momentum_user';
  }

  // Token management
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setTokens(token, refreshToken) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    }
    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  removeTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  // User data management
  getUser() {
    const userStr = localStorage.getItem(this.userKey);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  setUser(user) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, refreshToken, user } = response.data;
      
      this.setTokens(token, refreshToken);
      this.setUser(user);
      
      return {
        success: true,
        data: { token, refreshToken, user },
        message: 'Login successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
        status: error.response?.status
      };
    }
  }

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, refreshToken, user } = response.data;
      
      this.setTokens(token, refreshToken);
      this.setUser(user);
      
      return {
        success: true,
        data: { token, refreshToken, user },
        message: 'Registration successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
        status: error.response?.status,
        validationErrors: error.response?.data?.errors
      };
    }
  }

  async logout() {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.removeTokens();
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  }

  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { token, refreshToken: newRefreshToken, user } = response.data;
      
      this.setTokens(token, newRefreshToken || refreshToken);
      if (user) {
        this.setUser(user);
      }
      
      return {
        success: true,
        data: { token, refreshToken: newRefreshToken || refreshToken, user },
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      this.removeTokens();
      return {
        success: false,
        error: error.response?.data?.message || 'Token refresh failed',
        status: error.response?.status
      };
    }
  }

  async checkAuthStatus() {
    try {
      const token = this.getToken();
      if (!token) {
        return {
          success: false,
          error: 'No token found'
        };
      }

      const response = await api.get('/auth/me');
      const { user } = response.data;
      
      this.setUser(user);
      
      return {
        success: true,
        data: { user },
        message: 'Authentication valid'
      };
    } catch (error) {
      if (error.response?.status === 401) {
        // Try to refresh token
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          // Retry the auth check
          return this.checkAuthStatus();
        }
      }
      
      this.removeTokens();
      return {
        success: false,
        error: error.response?.data?.message || 'Authentication check failed',
        status: error.response?.status
      };
    }
  }

  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return {
        success: true,
        data: response.data,
        message: 'Password reset email sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send reset email',
        status: error.response?.status
      };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password: newPassword
      });
      return {
        success: true,
        data: response.data,
        message: 'Password reset successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Password reset failed',
        status: error.response?.status
      };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return {
        success: true,
        data: response.data,
        message: 'Password changed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Password change failed',
        status: error.response?.status
      };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      const { user } = response.data;
      
      this.setUser(user);
      
      return {
        success: true,
        data: { user },
        message: 'Profile updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Profile update failed',
        status: error.response?.status,
        validationErrors: error.response?.data?.errors
      };
    }
  }

  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { user } = response.data;
      this.setUser(user);
      
      return {
        success: true,
        data: { user },
        message: 'Avatar uploaded successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Avatar upload failed',
        status: error.response?.status
      };
    }
  }

  async deleteAvatar() {
    try {
      const response = await api.delete('/auth/avatar');
      const { user } = response.data;
      
      this.setUser(user);
      
      return {
        success: true,
        data: { user },
        message: 'Avatar deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Avatar deletion failed',
        status: error.response?.status
      };
    }
  }

  async verifyEmail(token) {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return {
        success: true,
        data: response.data,
        message: 'Email verified successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Email verification failed',
        status: error.response?.status
      };
    }
  }

  async resendVerificationEmail() {
    try {
      const response = await api.post('/auth/resend-verification');
      return {
        success: true,
        data: response.data,
        message: 'Verification email sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send verification email',
        status: error.response?.status
      };
    }
  }

  // Utility methods
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  isTokenExpired(token = null) {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;

    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  getTokenPayload(token = null) {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return null;

    try {
      return JSON.parse(atob(tokenToCheck.split('.')[1]));
    } catch (error) {
      console.error('Error parsing token payload:', error);
      return null;
    }
  }

  getUserRole() {
    const user = this.getUser();
    return user?.role || null;
  }

  hasRole(role) {
    const userRole = this.getUserRole();
    if (!userRole) return false;
    
    const roleHierarchy = {
      'super_admin': 4,
      'admin': 3,
      'manager': 2,
      'employee': 1
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[role];
  }

  hasPermission(permission) {
    const user = this.getUser();
    return user?.permissions?.includes(permission) || false;
  }

  // Session management
  startSessionTimer() {
    const token = this.getToken();
    if (!token) return;

    const payload = this.getTokenPayload(token);
    if (!payload) return;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;

    // Refresh token 5 minutes before expiration
    const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 0);

    if (refreshTime > 0) {
      setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  // Clear all auth data
  clearAuth() {
    this.removeTokens();
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;

// Also export the class for testing purposes
export { AuthService };