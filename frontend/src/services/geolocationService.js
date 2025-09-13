class GeolocationService {
  constructor() {
    this.watchId = null;
    this.lastKnownPosition = null;
    this.isWatching = false;
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    };
    this.callbacks = {
      success: [],
      error: [],
      change: [],
    };
  }

  // Check if geolocation is supported
  isSupported() {
    return 'geolocation' in navigator;
  }

  // Get current position
  async getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const mergedOptions = { ...this.options, ...options };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.lastKnownPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          resolve(this.lastKnownPosition);
        },
        (error) => {
          const errorMessage = this.getErrorMessage(error);
          reject(new Error(errorMessage));
        },
        mergedOptions
      );
    });
  }

  // Start watching position
  startWatching(options = {}) {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    if (this.isWatching) {
      this.stopWatching();
    }

    const mergedOptions = { ...this.options, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        };

        const hasChanged = !this.lastKnownPosition || 
          this.lastKnownPosition.latitude !== newPosition.latitude ||
          this.lastKnownPosition.longitude !== newPosition.longitude;

        this.lastKnownPosition = newPosition;

        // Trigger success callbacks
        this.callbacks.success.forEach(callback => {
          try {
            callback(newPosition);
          } catch (error) {
            console.error('Error in geolocation success callback:', error);
          }
        });

        // Trigger change callbacks if position changed
        if (hasChanged) {
          this.callbacks.change.forEach(callback => {
            try {
              callback(newPosition);
            } catch (error) {
              console.error('Error in geolocation change callback:', error);
            }
          });
        }
      },
      (error) => {
        const errorMessage = this.getErrorMessage(error);
        
        // Trigger error callbacks
        this.callbacks.error.forEach(callback => {
          try {
            callback(new Error(errorMessage));
          } catch (callbackError) {
            console.error('Error in geolocation error callback:', callbackError);
          }
        });
      },
      mergedOptions
    );

    this.isWatching = true;
    return this.watchId;
  }

  // Stop watching position
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  // Add event listeners
  addEventListener(type, callback) {
    if (this.callbacks[type]) {
      this.callbacks[type].push(callback);
    }
  }

  // Remove event listeners
  removeEventListener(type, callback) {
    if (this.callbacks[type]) {
      const index = this.callbacks[type].indexOf(callback);
      if (index > -1) {
        this.callbacks[type].splice(index, 1);
      }
    }
  }

  // Get last known position
  getLastKnownPosition() {
    return this.lastKnownPosition;
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Check if a point is within a circular geofence
  isWithinCircularGeofence(userLat, userLon, fenceLat, fenceLon, radius) {
    const distance = this.calculateDistance(userLat, userLon, fenceLat, fenceLon);
    return distance <= radius;
  }

  // Check if a point is within a polygon geofence
  isWithinPolygonGeofence(userLat, userLon, polygonCoords) {
    let inside = false;
    const x = userLon;
    const y = userLat;

    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const xi = polygonCoords[i][1]; // longitude
      const yi = polygonCoords[i][0]; // latitude
      const xj = polygonCoords[j][1]; // longitude
      const yj = polygonCoords[j][0]; // latitude

      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Validate location against geofences
  async validateLocation(geofences, position = null) {
    try {
      const currentPosition = position || await this.getCurrentPosition();
      const { latitude, longitude } = currentPosition;

      const results = geofences.map(geofence => {
        let isInside = false;

        if (geofence.type === 'circle') {
          isInside = this.isWithinCircularGeofence(
            latitude,
            longitude,
            geofence.center.latitude,
            geofence.center.longitude,
            geofence.radius
          );
        } else if (geofence.type === 'polygon') {
          isInside = this.isWithinPolygonGeofence(
            latitude,
            longitude,
            geofence.coordinates
          );
        }

        return {
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          isInside,
          distance: geofence.type === 'circle' 
            ? this.calculateDistance(
                latitude,
                longitude,
                geofence.center.latitude,
                geofence.center.longitude
              )
            : null,
        };
      });

      return {
        position: currentPosition,
        validations: results,
        isValid: results.some(result => result.isInside),
      };
    } catch (error) {
      throw new Error(`Location validation failed: ${error.message}`);
    }
  }

  // Get permission status
  async getPermissionStatus() {
    if (!('permissions' in navigator)) {
      return 'unsupported';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      return 'unknown';
    }
  }

  // Request permission
  async requestPermission() {
    try {
      await this.getCurrentPosition();
      return 'granted';
    } catch (error) {
      if (error.message.includes('denied')) {
        return 'denied';
      }
      return 'error';
    }
  }

  // Get error message from GeolocationPositionError
  getErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable';
      case error.TIMEOUT:
        return 'Location request timed out';
      default:
        return 'An unknown error occurred while retrieving location';
    }
  }

  // Format coordinates for display
  formatCoordinates(latitude, longitude, precision = 6) {
    return {
      latitude: parseFloat(latitude.toFixed(precision)),
      longitude: parseFloat(longitude.toFixed(precision)),
      formatted: `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`,
    };
  }

  // Convert meters to human-readable distance
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else if (meters < 10000) {
      return `${(meters / 1000).toFixed(1)}km`;
    } else {
      return `${Math.round(meters / 1000)}km`;
    }
  }

  // Get accuracy description
  getAccuracyDescription(accuracy) {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Good';
    if (accuracy <= 20) return 'Fair';
    if (accuracy <= 50) return 'Poor';
    return 'Very Poor';
  }

  // Check if location is stale
  isLocationStale(timestamp, maxAge = 300000) { // 5 minutes default
    return Date.now() - timestamp > maxAge;
  }

  // Get location with retry logic
  async getCurrentPositionWithRetry(maxRetries = 3, retryDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.getCurrentPosition();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // Background location tracking for PWA
  async startBackgroundTracking() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-location');
        return true;
      } catch (error) {
        console.warn('Background sync not supported:', error);
        return false;
      }
    }
    return false;
  }

  // Stop background tracking
  async stopBackgroundTracking() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.ready;
        // Note: There's no direct way to unregister a specific sync
        // This would need to be handled in the service worker
        return true;
      } catch (error) {
        console.warn('Error stopping background tracking:', error);
        return false;
      }
    }
    return false;
  }

  // Cleanup
  destroy() {
    this.stopWatching();
    this.callbacks.success = [];
    this.callbacks.error = [];
    this.callbacks.change = [];
    this.lastKnownPosition = null;
  }
}

// Create and export a singleton instance
const geolocationService = new GeolocationService();
export default geolocationService;

// Also export the class for testing purposes
export { GeolocationService };