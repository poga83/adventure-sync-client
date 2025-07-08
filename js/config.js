export const CONFIG = {
  SERVER_URL: 'https://adventure-sync-server-production.up.railway.app',
  SOCKET: {
    transports: ['websocket','polling'],
    reconnectionAttempts: 10,
    pingInterval: 25000,
    pingTimeout: 60000
  },
  MAP: { DEFAULT_CENTER: [55.7558,37.6173], DEFAULT_ZOOM: 10 }
};

export async function pingServer() {
  try {
    const res = await fetch(`${CONFIG.SERVER_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
