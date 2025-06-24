const CONFIG = {
    // ИСПРАВЛЕНО: Подключение к серверу на Render
    SERVER_URL: 'https://adventure-sync-server.onrender.com',
    
    // Альтернативные URL для тестирования
    FALLBACK_URLS: [
        'https://adventure-sync-server.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    
    MAP: {
        DEFAULT_CENTER: [55.7558, 37.6173], // Москва
        DEFAULT_ZOOM: 10,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        DEBUG_MODE: false,
        FORCE_CANVAS: true,
        MIN_ZOOM: 2,
        MAX_ZOOM: 18
    },
    
    // ИСПРАВЛЕНО: Настройки для роутинга по дорогам
    ROUTING: {
        // Используем OpenRouteService для бесплатного роутинга
        PROVIDER: 'openrouteservice',
        API_KEY: '5b3ce3597851110001cf6248a1b8ed27eb8a4e9b9e8bcf0f1cc1c715', // Публичный ключ для демо
        BASE_URL: 'https://api.openrouteservice.org/v2/directions',
        PROFILE: 'driving-car', // driving-car, cycling-regular, foot-walking
        FORMAT: 'geojson'
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
        AUTO: 'auto',
        MOTO: 'moto', 
        WALKING: 'walking',
        BUSY: 'busy'
    },
    
    CACHE: {
        POSITIONS_KEY: 'adventure_sync_positions',
        MESSAGES_KEY: 'adventure_sync_messages',
        USER_KEY: 'adventure_sync_user',
        ROUTES_KEY: 'adventure_sync_routes',
        TRIPS_KEY: 'adventure_sync_trips'
    },
    
    // ИСПРАВЛЕНО: Настройки Socket.IO для HTTPS
    SOCKET: {
        TIMEOUT: 15000,
        RECONNECTION_ATTEMPTS: 5,
        RECONNECTION_DELAY: 2000,
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000,
        FORCE_NEW: false,
        UPGRADE: true,
        SECURE: true // Для HTTPS соединения
    },
    
    UI: {
        NOTIFICATION_TIMEOUT: 5000,
        MAP_INVALIDATE_DELAY: 300,
        SIDEBAR_ANIMATION_DURATION: 300
    },
    
    // НОВЫЙ: Настройки планирования поездок
    TRIP_PLANNING: {
        MAX_WAYPOINTS: 10,
        MAX_DAYS: 30,
        SUPPORTED_FORMATS: ['gpx', 'kml', 'json'],
        AUTO_SAVE_INTERVAL: 30000 // 30 секунд
    }
};

// ИСПРАВЛЕНО: Функция для проверки доступности сервера с HTTPS
CONFIG.testServerConnection = async function() {
    for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                timeout: 10000,
                mode: 'cors'
            });
            if (response.ok) {
                CONFIG.SERVER_URL = url;
                console.log(`✅ Сервер доступен: ${url}`);
                return true;
            }
        } catch (error) {
            console.warn(`⚠️ Сервер недоступен по адресу ${url}:`, error.message);
        }
    }
    return false;
};

CONFIG.getMapOptions = function() {
    return {
        preferCanvas: CONFIG.MAP.FORCE_CANVAS,
        zoomControl: false,
        attributionControl: true,
        minZoom: CONFIG.MAP.MIN_ZOOM,
        maxZoom: CONFIG.MAP.MAX_ZOOM
    };
};

// НОВЫЙ: Функция для получения настроек роутинга
CONFIG.getRoutingOptions = function(profile = 'driving-car') {
    return {
        profile: profile,
        format: CONFIG.ROUTING.FORMAT,
        api_key: CONFIG.ROUTING.API_KEY,
        geometries: 'geojson',
        overview: 'full',
        steps: true,
        continue_straight: false
    };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
