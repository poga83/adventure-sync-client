/* js/config.js */
export const CONFIG = {
  // ОБНОВЛЕНО: URL Railway сервера
  SERVER_URL: 'https://adventure-sync-server-production.up.railway.app',
  FALLBACK_URLS: [
    'https://adventure-sync-server-production.up.railway.app',
    'http://localhost:3000'
  ],
  
  SOCKET: {
    transports: ['websocket', 'polling'],
    timeout: 30000,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
    pingInterval: 25000,
    pingTimeout: 60000,
    secure: true,
    withCredentials: false,
    upgrade: true,
    rememberUpgrade: true,
    forceNew: false,
    
    // Оптимизация для Railway
    autoConnect: true,
    multiplex: true,
    rejectUnauthorized: false // Railway может использовать самоподписанные сертификаты
  },
  
  MAP: {
    DEFAULT_CENTER: [55.7558, 37.6173],
    DEFAULT_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '© OpenStreetMap contributors'
  },
  
  UI: { 
    NOTIFICATION_TIMEOUT: 5000,
    CONNECTION_CHECK_INTERVAL: 30000,
    MAX_MESSAGE_LENGTH: 500
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

// Улучшенная проверка Railway сервера
export async function pingServer() {
  for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
    try {
      console.log(`🔍 Проверка Railway сервера: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Adventure-Sync-Client'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        CONFIG.SERVER_URL = url;
        console.log(`✅ Railway сервер доступен: ${url}`, data);
        return { success: true, data };
      }
    } catch (error) {
      console.warn(`⚠️ Railway сервер недоступен ${url}:`, error.message);
    }
  }
  return { success: false };
}

// Получение статистики Railway сервера
export async function getServerStats() {
  try {
    const response = await fetch(`${CONFIG.SERVER_URL}/stats`, { 
      mode: 'cors',
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('⚠️ Не удалось получить статистику Railway:', error);
  }
  return null;
}
