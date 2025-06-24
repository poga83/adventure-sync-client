const CONFIG = {
  SERVER_URL: 'https://adventure-sync-server.onrender.com',
  FALLBACK_URLS: [
    'https://adventure-sync-server.onrender.com',
    'https://adventure-sync-server.onrender.com/',
    'https://backup-server.onrender.com',
    'http://localhost:3000'
  ],
  MAP: {
    DEFAULT_CENTER: [55.7558, 37.6173],
    DEFAULT_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; OpenStreetMap contributors',
    FORCE_CANVAS: true,
    MIN_ZOOM: 2,
    MAX_ZOOM: 18
  },
  ROUTING: {
    API_KEY: '5b3ce3597851110001cf6248a1b8ed27eb8a4e9b9e8bcf0f1cc1c715',
    BASE_URL: 'https://api.openrouteservice.org/v2/directions',
    FALLBACK_URL: 'https://router.project-osrm.org/route/v1',
    PROFILE: 'driving-car',
    FORMAT: 'geojson',
    REQUEST_TIMEOUT: 15000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000
  },
  SOCKET: {
    TIMEOUT: 45000,
    RECONNECTION_ATTEMPTS: 10,
    RECONNECTION_DELAY: 3000,
    RECONNECTION_DELAY_MAX: 30000,
    PING_TIMEOUT: 60000,
    PING_INTERVAL: 25000,
    UPGRADE: true,
    ENABLE_POLLING: true,
    POLLING_TIMEOUT: 45000,
    COLD_START_TIMEOUT: 120000,
    COLD_START_RETRIES: 5,
    USE_EXPONENTIAL_BACKOFF: true,
    BACKOFF_MULTIPLIER: 1.5
  },
  UI: {
    NOTIFICATION_TIMEOUT: 5000
  },
  TRIP_PLANNING: {
    MAX_WAYPOINTS: 15,
    MAX_DAYS: 30,
    AUTO_SAVE_INTERVAL: 30000
  }
};

// Проверка серверов и активация Render
CONFIG.testServerConnection = async () => {
  for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
    try {
      const res = await fetch(`${url}/health`, { method: 'GET', mode: 'cors', timeout: 15000 });
      if (res.ok) { CONFIG.SERVER_URL = url; return true; }
    } catch {}
  }
  return false;
};

CONFIG.testServerWithWakeup = async () => {
  for (let attempt = 0; attempt < CONFIG.SOCKET.COLD_START_RETRIES; attempt++) {
    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/health`, { method: 'GET', mode: 'cors', timeout: CONFIG.SOCKET.COLD_START_TIMEOUT });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 10000 + attempt * 5000));
  }
  return false;
};

CONFIG.testOpenRouteService = async () => {
  for (let i = 0; i < CONFIG.ROUTING.MAX_RETRIES; i++) {
    try {
      const res = await fetch(`${CONFIG.ROUTING.BASE_URL}/driving-car/geojson`, {
        method: 'POST',
        headers: { 'Authorization': CONFIG.ROUTING.API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates:[[8.68,49.41],[8.69,49.42]] }),
        timeout: CONFIG.ROUTING.REQUEST_TIMEOUT
      });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, CONFIG.ROUTING.RETRY_DELAY));
  }
  return false;
};

CONFIG.selectBestRoutingService = async () => {
  if (await CONFIG.testOpenRouteService()) return 'openrouteservice';
  return 'osrm';
};
