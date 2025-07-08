export const CONFIG = {
  SERVER_URL: 'https://adventure-sync-server-production.up.railway.app',
  SOCKET: {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    pingInterval: 25000,
    pingTimeout: 60000
  },
  MAP: {
    DEFAULT_CENTER: [55.7558, 37.6173],
    DEFAULT_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '© OpenStreetMap contributors'
  },
  UI: {
    NOTIFICATION_TIMEOUT: 5000
  }
};

export async function pingServer() {
  try {
    console.log('🔍 Проверка сервера...');
    const response = await fetch(`${CONFIG.SERVER_URL}/health`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Сервер доступен:', data);
      return true;
    } else {
      console.error('❌ Сервер недоступен:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка подключения к серверу:', error);
    return false;
  }
}
