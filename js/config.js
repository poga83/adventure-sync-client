const CONFIG = {
  SERVER_URL: 'http://localhost:3000',
  MAP: {
    DEFAULT_CENTER: [55.7558, 37.6173],
    DEFAULT_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  STATUSES: {
    AVAILABLE: 'available',
    HIKING: 'hiking',
    TRAVELING: 'traveling',
    BUSY: 'busy'
  },
  CACHE: {
    USER_KEY: 'adventure_sync_user',
    POSITIONS_KEY: 'adventure_sync_positions',
    MESSAGES_KEY: 'adventure_sync_messages'
  }
};
