import { EmergencyAlert } from './emergencyService';

const STORAGE_KEY = 'emergency_alerts_v1';

// Helper to read from localStorage
function readFromStorage(): EmergencyAlert[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('📖 Read from localStorage:', parsed.length, 'alerts');
      return parsed;
    }
  } catch (error) {
    console.error('❌ Error reading from localStorage:', error);
  }
  return [];
}

// Helper to write to localStorage
function writeToStorage(alerts: EmergencyAlert[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    console.log('💾 Wrote to localStorage:', alerts.length, 'alerts');
  } catch (error) {
    console.error('❌ Error writing to localStorage:', error);
  }
}

// In-memory cache (refreshed from localStorage on each access)
let cachedAlerts: EmergencyAlert[] | null = null;
let listeners: (() => void)[] = [];

export const mockEmergencyStorage = {
  // Get all alerts (fresh from localStorage)
  getAlerts(): EmergencyAlert[] {
    cachedAlerts = readFromStorage();
    return [...cachedAlerts];
  },

  // Get active alerts
  getActiveAlerts(): EmergencyAlert[] {
    const alerts = this.getAlerts();
    const active = alerts.filter(alert => alert.status !== 'resolved');
    console.log('📤 getActiveAlerts:', active.length, 'of', alerts.length, 'alerts');
    return active;
  },

  // Add alert
  addAlert(alert: EmergencyAlert): void {
    console.log('📥 addAlert:', alert.id);
    const current = readFromStorage();
    current.unshift(alert);
    writeToStorage(current);
    cachedAlerts = current;
    this.notifyListeners();
  },

  // Update alert status
  updateAlertStatus(alertId: string, status: EmergencyAlert['status'], resolvedBy?: string): void {
    const current = readFromStorage();
    const index = current.findIndex(a => a.id === alertId);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        status,
        resolved_by: resolvedBy,
        resolved_at: status === 'resolved' ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      };
      writeToStorage(current);
      cachedAlerts = current;
      this.notifyListeners();
    }
  },

  // Subscribe
  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    console.log('📢 Listener added, total:', listeners.length);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  },

  // Notify
  notifyListeners(): void {
    console.log('📢 Notifying', listeners.length, 'listeners');
    listeners.forEach(l => {
      try { l(); } catch (e) { console.error(e); }
    });
  },

  // Clear
  clearAlerts(): void {
    writeToStorage([]);
    cachedAlerts = [];
    this.notifyListeners();
  },

  // Debug
  debugInfo() {
    const alerts = readFromStorage();
    console.log('🐛 Debug:', {
      total: alerts.length,
      active: alerts.filter(a => a.status !== 'resolved').length,
      listeners: listeners.length,
      alerts: alerts.map(a => ({ id: a.id, type: a.alert_type, status: a.status }))
    });
  }
};

// Listen for storage events from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    console.log('🔄 Storage changed in another tab');
    cachedAlerts = null; // Clear cache to force re-read
    mockEmergencyStorage.notifyListeners();
  }
});

console.log('✅ mockEmergencyStorage initialized');
