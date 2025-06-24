const CONFIG = {
  SERVER_URL: 'https://adventure-sync-server.onrender.com',
  FALLBACK_URLS: [
    'https://adventure-sync-server.onrender.com/',
    'https://adventure-sync-backup.onrender.com/',
    'http://localhost:3000'
  ],
  SOCKET: {
    transports: ['websocket','polling'],
    secure: true,
    withCredentials: true,
    timeout:30000,
    reconnectionAttempts:5,
    reconnectionDelay:2000,
    pingTimeout:60000,
    pingInterval:25000
  },
  ROUTING: {
    PROVIDER:'openrouteservice',
    API_KEY:'ВАШ_API_КЛЮЧ',
    BASE_URL:'https://api.openrouteservice.org/v2/directions',
    FALLBACK_URL:'https://router.project-osrm.org/route/v1',
    PROFILE:'driving-car',
    FORMAT:'geojson'
  }
};

CONFIG.testServer = async function() {
  for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
    try {
      const res = await fetch(`${url}/health`, {
        method:'GET', mode:'cors', credentials:'include'
      });
      if (res.ok) { CONFIG.SERVER_URL = url; return true; }
    } catch {}
  }
  return false;
};

export default CONFIG;
