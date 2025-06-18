const CONFIG = {
    SERVER_URL: 'http://localhost:3000',
    MAP: {
        DEFAULT_CENTER: [55.7558, 37.6173], // Москва
        DEFAULT_ZOOM: 10,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    MARKER_CLUSTER: {
        CHUNKED_LOADING: true,
        SPIDERFY_ON_MAX_ZOOM: true,
        DISABLE_CLUSTERING_AT_ZOOM: 16,
        MAX_CLUSTER_RADIUS: 50,
        ZOOM_TO_BOUNDS_ON_CLICK: true,
        SHOW_COVERAGE_ON_HOVER: false
    },
    STATUSES: {
        AVAILABLE: 'available',
        HIKING: 'hiking',
        TRAVELING: 'traveling',
        BUSY: 'busy'
    },
    CACHE: {
        POSITIONS_KEY: 'adventure_sync_positions',
        MESSAGES_KEY: 'adventure_sync_messages',
        USER_KEY: 'adventure_sync_user'
    }
};
