import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Alert, CircularProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { showNotification } from '../../store/slices/uiSlice';
import { validateLocation } from '../../store/slices/punchSlice';
import { getGeofences } from '../../store/slices/geofenceSlice';

// Set your Mapbox access token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoibW9tZW50dW0tYXBwIiwiYSI6ImNscXh5ejF4YjBhcmQya3BjZGZxdGZxdGcifQ.example';

const MapboxMap = ({
  center = [-74.006, 40.7128], // Default to NYC
  zoom = 12,
  height = '400px',
  showGeofences = true,
  showUserLocation = true,
  onLocationUpdate = null,
  interactive = true,
  geofenceId = null
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  const dispatch = useDispatch();
  const { geofences } = useSelector(state => state.geofence);
  const { currentLocation } = useSelector(state => state.punch);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
        interactive: interactive
      });

      map.current.on('load', () => {
        setLoading(false);
        
        // Add geofence source
        map.current.addSource('geofences', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        // Add geofence fill layer
        map.current.addLayer({
          id: 'geofence-fill',
          type: 'fill',
          source: 'geofences',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2
          }
        });

        // Add geofence border layer
        map.current.addLayer({
          id: 'geofence-border',
          type: 'line',
          source: 'geofences',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2
          }
        });

        // Load geofences
        if (showGeofences) {
          dispatch(getGeofences());
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Failed to load map. Please check your internet connection.');
        setLoading(false);
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map. Please check your Mapbox token.');
      setLoading(false);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, interactive, showGeofences, dispatch]);

  // Update geofences on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !showGeofences) return;

    const geofenceFeatures = geofences.map(geofence => {
      // Convert geofence data to GeoJSON
      let geometry;
      
      if (geofence.type === 'circle') {
        // Create circle polygon from center and radius
        const center = [geofence.longitude, geofence.latitude];
        const radius = geofence.radius; // in meters
        const points = 64;
        const coordinates = [];
        
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const dx = radius * Math.cos(angle) / 111320; // Convert meters to degrees
          const dy = radius * Math.sin(angle) / 110540;
          coordinates.push([center[0] + dx, center[1] + dy]);
        }
        coordinates.push(coordinates[0]); // Close the polygon
        
        geometry = {
          type: 'Polygon',
          coordinates: [coordinates]
        };
      } else if (geofence.type === 'polygon') {
        geometry = {
          type: 'Polygon',
          coordinates: geofence.coordinates
        };
      }

      return {
        type: 'Feature',
        properties: {
          id: geofence.id,
          name: geofence.name,
          type: geofence.type,
          active: geofence.active
        },
        geometry
      };
    }).filter(feature => feature.geometry); // Filter out invalid geometries

    // Update geofences source
    const source = map.current.getSource('geofences');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: geofenceFeatures
      });
    }
  }, [geofences, showGeofences]);

  // Handle user location
  useEffect(() => {
    if (!map.current || !showUserLocation) return;

    if (currentLocation) {
      setUserLocation(currentLocation);
      
      // Add or update user location marker
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: #ef4444;
        border: 3px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
      `;

      // Remove existing user marker
      const existingMarker = document.querySelector('.user-location-marker');
      if (existingMarker) {
        existingMarker.remove();
      }

      new mapboxgl.Marker(el)
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map.current);

      // Center map on user location
      map.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 15
      });

      // Validate location against geofences
      if (onLocationUpdate) {
        onLocationUpdate(currentLocation);
      }
    }
  }, [currentLocation, showUserLocation, onLocationUpdate]);

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      dispatch(showNotification({
        type: 'error',
        message: 'Geolocation is not supported by this browser'
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        setUserLocation(location);
        
        if (onLocationUpdate) {
          onLocationUpdate(location);
        }

        // Validate location
        dispatch(validateLocation(location));
      },
      (error) => {
        console.error('Geolocation error:', error);
        dispatch(showNotification({
          type: 'error',
          message: 'Failed to get your location. Please enable location services.'
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Auto-get location on mount
  useEffect(() => {
    if (showUserLocation && !userLocation) {
      getCurrentLocation();
    }
  }, [showUserLocation]);

  if (error) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px'
        }}
      />
    </Box>
  );
};

export default MapboxMap;