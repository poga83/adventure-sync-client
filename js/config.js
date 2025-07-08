export const CONFIG = {
  SERVER_URL: 'https://adventure-sync-server-production.up.railway.app',
  
  SOCKET: {
    transports: ['websocket', 'polling'],
    timeout: 30000,
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
  }
};

export async function pingServer() {
  try {
    const response = await fetch(`${CONFIG.SERVER_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Сервер доступен:', data);
      return { success: true, data };
    }
  } catch (error) {
    console.error('❌ Сервер недоступен:', error);
  }
  return { success: false };
}
