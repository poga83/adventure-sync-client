/* js/config.js */
export const CONFIG = {
  // ОБНОВЛЕНО: Новый URL сервера на Fly.io
  SERVER_URL: 'https://adventure-sync-server.fly.dev',
  FALLBACK_URLS: [
    'https://adventure-sync-server.fly.dev',
    'http://localhost:3000'
  ],
  
  SOCKET: {
    transports: ['websocket', 'polling'],
    timeout: 30000,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    pingInterval: 25000,
    pingTimeout: 60000,
    secure: true,
    withCredentials: false,
    upgrade: true,
    rememberUpgrade: true,
    
    // Дополнительные настройки для Fly.io
    forceNew: false,
    multiplex: true
  },
  
  MAP: {
    DEFAULT_CENTER: [55.7558, 37.6173],
    DEFAULT_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; OpenStreetMap contributors'
  },
  
  UI: { 
    NOTIFICATION_TIMEOUT: 5000,
    CONNECTION_CHECK_INTERVAL: 30000
  },
  
  ROUTING: {
    PROVIDER: 'openrouteservice',
    API_KEY: '5b3ce3597851110001cf6248a1b8ed27eb8a4e9b9e8bcf0f1cc1c715',
    BASE_URL: 'https://api.openrouteservice.org/v2/directions',
    FALLBACK_URL: 'https://router.project-osrm.org/route/v1',
    PROFILE: 'driving-car',
    FORMAT: 'geojson'
  }
};

// Улучшенная проверка сервера для Fly.io
export async function pingServer() {
  for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
    try {
      console.log(`🔍 Проверка Fly.io сервера: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        CONFIG.SERVER_URL = url;
        console.log(`✅ Fly.io сервер доступен: ${url}`, data);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ Fly.io сервер недоступен ${url}:`, error.message);
    }
  }
  return false;
}

// Проверка статуса Fly.io региона
export async function checkFlyRegion() {
  try {
    const response = await fetch(`${CONFIG.SERVER_URL}/`, { mode: 'cors' });
    if (response.ok) {
      const data = await response.json();
      console.log('🌍 Подключено к Fly.io серверу:', data);
      return data;
    }
  } catch (error) {
    console.warn('⚠️ Не удалось получить информацию о Fly.io регионе:', error);
  }
  return null;
}
