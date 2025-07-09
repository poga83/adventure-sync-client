export const CONFIG = {
  // Обновленный URL для Render
  SERVER_URL: 'https://adventure-sync-server.onrender.com',
  
  FALLBACK_URLS: [
    'https://adventure-sync-server.onrender.com',
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
    upgrade: true,
    rememberUpgrade: true,
    forceNew: false
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
  }
};

// Проверка доступности Render сервера
export async function pingServer() {
  for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
    try {
      console.log(`🔍 Проверка Render сервера: ${url}`);
      
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
        console.log(`✅ Render сервер доступен: ${url}`, data);
        return { success: true, data };
      }
    } catch (error) {
      console.warn(`⚠️ Render сервер недоступен ${url}:`, error.message);
    }
  }
  return { success: false };
}
