/* js/config.js  –  только конфиг и проверка сервера */
export const CONFIG = {
  SERVER_URL: 'https://adventure-sync-server-d10jdvk9c44c73dp036g.onrender.com',
  FALLBACK_URLS: ['https://adventure-sync-server-d10jdvk9c44c73dp036g.onrender.com','http://localhost:3000'],
  SOCKET: {
    transports: ['websocket','polling'],
    timeout: 30000,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    pingInterval: 25000,
    pingTimeout: 60000,
    secure: true,
    withCredentials: false          // GitHub Pages
  },
  MAP: {
    DEFAULT_CENTER: [55.7558,37.6173],
    DEFAULT_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; OpenStreetMap contributors'
  },
  UI: { NOTIFICATION_TIMEOUT: 5000 }
};

export async function pingServer () {
  for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
    try {
      const r = await fetch(`${url}/health`, {mode:'cors'});
      if (r.ok) { CONFIG.SERVER_URL = url; return true; }
    } catch {/* ignore */}
  }
  return false;
}
