import api from './api';

class SettingsService {
  // Get user settings
  async getSettings() {
    try {
      const response = await api.get('/settings');
      return response;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  // Update general settings
  async updateSettings(settingsData) {
    try {
      const response = await api.put('/settings', settingsData);
      return response;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Update notification settings
  async updateNotificationSettings(notificationData) {
    try {
      const response = await api.put('/settings/notifications', notificationData);
      return response;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  // Update work settings
  async updateWorkSettings(workData) {
    try {
      const response = await api.put('/settings/work', workData);
      return response;
    } catch (error) {
      console.error('Error updating work settings:', error);
      throw error;
    }
  }

  // Update privacy settings
  async updatePrivacySettings(privacyData) {
    try {
      const response = await api.put('/settings/privacy', privacyData);
      return response;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  // Update display settings
  async updateDisplaySettings(displayData) {
    try {
      const response = await api.put('/settings/display', displayData);
      return response;
    } catch (error) {
      console.error('Error updating display settings:', error);
      throw error;
    }
  }

  // Reset settings to default
  async resetSettings() {
    try {
      const response = await api.post('/settings/reset');
      return response;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }

  // Export settings
  async exportSettings() {
    try {
      const response = await api.get('/settings/export');
      return response;
    } catch (error) {
      console.error('Error exporting settings:', error);
      throw error;
    }
  }

  // Import settings
  async importSettings(settingsFile) {
    try {
      const formData = new FormData();
      formData.append('settings', settingsFile);
      
      const response = await api.post('/settings/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Error importing settings:', error);
      throw error;
    }
  }

  // Get system settings (admin only)
  async getSystemSettings() {
    try {
      const response = await api.get('/settings/system');
      return response;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  }

  // Update system settings (admin only)
  async updateSystemSettings(systemData) {
    try {
      const response = await api.put('/settings/system', systemData);
      return response;
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  // Get company settings (admin only)
  async getCompanySettings() {
    try {
      const response = await api.get('/settings/company');
      return response;
    } catch (error) {
      console.error('Error fetching company settings:', error);
      throw error;
    }
  }

  // Update company settings (admin only)
  async updateCompanySettings(companyData) {
    try {
      const response = await api.put('/settings/company', companyData);
      return response;
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  }
}

const settingsService = new SettingsService();
export default settingsService;