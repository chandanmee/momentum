// Web Vitals reporting for performance monitoring
// This file measures and reports Core Web Vitals metrics

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Core Web Vitals
      getCLS(onPerfEntry); // Cumulative Layout Shift
      getFID(onPerfEntry); // First Input Delay
      getFCP(onPerfEntry); // First Contentful Paint
      getLCP(onPerfEntry); // Largest Contentful Paint
      getTTFB(onPerfEntry); // Time to First Byte
    }).catch((error) => {
      console.warn('Web Vitals could not be loaded:', error);
    });
  }
};

// Enhanced reporting with custom metrics
export const reportEnhancedWebVitals = (config = {}) => {
  const {
    onMetric = console.log,
    enableCustomMetrics = true,
    enableResourceTiming = true,
    enableNavigationTiming = true,
    enableMemoryInfo = true,
    enableNetworkInfo = true
  } = config;

  // Report Core Web Vitals
  reportWebVitals((metric) => {
    // Add additional context
    const enhancedMetric = {
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: getConnectionInfo(),
      viewport: getViewportInfo(),
      deviceMemory: getDeviceMemory()
    };

    onMetric(enhancedMetric);

    // Send to analytics service (if configured)
    if (config.analyticsEndpoint) {
      sendToAnalytics(config.analyticsEndpoint, enhancedMetric);
    }
  });

  // Custom performance metrics
  if (enableCustomMetrics) {
    measureCustomMetrics(onMetric);
  }

  // Resource timing
  if (enableResourceTiming) {
    measureResourceTiming(onMetric);
  }

  // Navigation timing
  if (enableNavigationTiming) {
    measureNavigationTiming(onMetric);
  }

  // Memory information
  if (enableMemoryInfo) {
    measureMemoryInfo(onMetric);
  }

  // Network information
  if (enableNetworkInfo) {
    measureNetworkInfo(onMetric);
  }
};

// Get connection information
function getConnectionInfo() {
  if ('connection' in navigator) {
    const conn = navigator.connection;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }
  return null;
}

// Get viewport information
function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: window.screen.orientation ? window.screen.orientation.type : null
  };
}

// Get device memory information
function getDeviceMemory() {
  return navigator.deviceMemory || null;
}

// Measure custom performance metrics
function measureCustomMetrics(onMetric) {
  // Time to Interactive (TTI) approximation
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            onMetric({
              name: 'custom-' + entry.name,
              value: entry.duration,
              rating: entry.duration < 1000 ? 'good' : entry.duration < 2500 ? 'needs-improvement' : 'poor',
              timestamp: entry.startTime
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  // App-specific metrics
  measureAppLoadTime(onMetric);
  measureRouteChangeTime(onMetric);
  measureAPIResponseTime(onMetric);
}

// Measure app load time
function measureAppLoadTime(onMetric) {
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    onMetric({
      name: 'app-load-time',
      value: loadTime,
      rating: loadTime < 2000 ? 'good' : loadTime < 4000 ? 'needs-improvement' : 'poor',
      timestamp: Date.now()
    });
  });
}

// Measure route change time
function measureRouteChangeTime(onMetric) {
  let routeChangeStart = null;

  // Listen for route changes (React Router)
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function(...args) {
    routeChangeStart = performance.now();
    return originalPushState.apply(this, args);
  };

  window.history.replaceState = function(...args) {
    routeChangeStart = performance.now();
    return originalReplaceState.apply(this, args);
  };

  window.addEventListener('popstate', () => {
    routeChangeStart = performance.now();
  });

  // Measure when route change completes
  const measureRouteComplete = () => {
    if (routeChangeStart) {
      const routeChangeTime = performance.now() - routeChangeStart;
      onMetric({
        name: 'route-change-time',
        value: routeChangeTime,
        rating: routeChangeTime < 500 ? 'good' : routeChangeTime < 1000 ? 'needs-improvement' : 'poor',
        timestamp: Date.now()
      });
      routeChangeStart = null;
    }
  };

  // Use MutationObserver to detect when DOM changes complete
  if ('MutationObserver' in window) {
    let timeoutId;
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(measureRouteComplete, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Measure API response time
function measureAPIResponseTime(onMetric) {
  // Intercept fetch requests
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const startTime = performance.now();
    const url = args[0];
    
    return originalFetch.apply(this, args)
      .then((response) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Only measure API calls
        if (typeof url === 'string' && url.includes('/api/')) {
          onMetric({
            name: 'api-response-time',
            value: responseTime,
            rating: responseTime < 500 ? 'good' : responseTime < 1000 ? 'needs-improvement' : 'poor',
            timestamp: Date.now(),
            url: url,
            status: response.status
          });
        }
        
        return response;
      })
      .catch((error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        if (typeof url === 'string' && url.includes('/api/')) {
          onMetric({
            name: 'api-error-time',
            value: responseTime,
            rating: 'poor',
            timestamp: Date.now(),
            url: url,
            error: error.message
          });
        }
        
        throw error;
      });
  };
}

// Measure resource timing
function measureResourceTiming(onMetric) {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceTime = entry.responseEnd - entry.startTime;
            onMetric({
              name: 'resource-load-time',
              value: resourceTime,
              rating: resourceTime < 1000 ? 'good' : resourceTime < 2000 ? 'needs-improvement' : 'poor',
              timestamp: entry.startTime,
              resource: entry.name,
              type: entry.initiatorType,
              size: entry.transferSize || 0
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource timing not supported:', error);
    }
  }
}

// Measure navigation timing
function measureNavigationTiming(onMetric) {
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      const metrics = {
        'dns-lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
        'tcp-connect': navigation.connectEnd - navigation.connectStart,
        'ssl-handshake': navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
        'request-response': navigation.responseEnd - navigation.requestStart,
        'dom-processing': navigation.domComplete - navigation.domLoading,
        'page-load': navigation.loadEventEnd - navigation.loadEventStart
      };

      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          onMetric({
            name: `navigation-${name}`,
            value,
            rating: value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor',
            timestamp: Date.now()
          });
        }
      });
    }
  });
}

// Measure memory information
function measureMemoryInfo(onMetric) {
  if ('memory' in performance) {
    const measureMemory = () => {
      const memory = performance.memory;
      onMetric({
        name: 'memory-usage',
        value: memory.usedJSHeapSize,
        rating: memory.usedJSHeapSize < memory.jsHeapSizeLimit * 0.7 ? 'good' : 
                memory.usedJSHeapSize < memory.jsHeapSizeLimit * 0.9 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
        totalHeapSize: memory.totalJSHeapSize,
        heapSizeLimit: memory.jsHeapSizeLimit
      });
    };

    // Measure initially and then periodically
    measureMemory();
    setInterval(measureMemory, 30000); // Every 30 seconds
  }
}

// Measure network information
function measureNetworkInfo(onMetric) {
  if ('connection' in navigator) {
    const connection = navigator.connection;
    
    const reportNetworkInfo = () => {
      onMetric({
        name: 'network-info',
        value: connection.downlink,
        rating: connection.effectiveType === '4g' ? 'good' : 
                connection.effectiveType === '3g' ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
    };

    // Report initially
    reportNetworkInfo();

    // Report on changes
    connection.addEventListener('change', reportNetworkInfo);
  }
}

// Send metrics to analytics service
function sendToAnalytics(endpoint, metric) {
  try {
    // Use sendBeacon if available for reliability
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(endpoint, JSON.stringify(metric));
    } else {
      // Fallback to fetch
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metric),
        keepalive: true
      }).catch((error) => {
        console.warn('Failed to send analytics:', error);
      });
    }
  } catch (error) {
    console.warn('Failed to send analytics:', error);
  }
}

// Performance budget monitoring
export const monitorPerformanceBudget = (budgets, onBudgetExceeded) => {
  const checkBudget = (metric) => {
    const budget = budgets[metric.name];
    if (budget && metric.value > budget) {
      onBudgetExceeded({
        metric: metric.name,
        value: metric.value,
        budget: budget,
        exceeded: metric.value - budget
      });
    }
  };

  reportWebVitals(checkBudget);
};

// Export default function
export default reportWebVitals;

console.log('Web Vitals reporting utilities loaded');