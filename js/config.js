const CONFIG = {
    // Подключение к серверу на Render
    SERVER_URL: 'https://adventure-sync-server.onrender.com',
    
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
    
    // ИСПРАВЛЕНО: Настройки для роутинга с рабочим API ключом
    ROUTING: {
        // Используем публичный API ключ OpenRouteService для демо
        PROVIDER: 'openrouteservice',
        API_KEY: '5b3ce3597851110001cf6248a1b8ed27eb8a4e9b9e8bcf0f1cc1c715',
        BASE_URL: 'https://api.openrouteservice.org/v2/directions',
        GEOCODING_URL: 'https://api.openrouteservice.org/geocode',
        PROFILE: 'driving-car',
        FORMAT: 'geojson',
        // Fallback к бесплатному сервису
        FALLBACK_PROVIDER: 'osrm',
        FALLBACK_URL: 'https://router.project-osrm.org/route/v1'
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
    
    SOCKET: {
        TIMEOUT: 15000,
        RECONNECTION_ATTEMPTS: 5,
        RECONNECTION_DELAY: 2000,
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000,
        FORCE_NEW: false,
        UPGRADE: true,
        SECURE: true
    },
    
    UI: {
        NOTIFICATION_TIMEOUT: 5000,
        MAP_INVALIDATE_DELAY: 300,
        SIDEBAR_ANIMATION_DURATION: 300
    },
    
    TRIP_PLANNING: {
        MAX_WAYPOINTS: 10,
        MAX_DAYS: 30,
        SUPPORTED_FORMATS: ['gpx', 'kml', 'json'],
        AUTO_SAVE_INTERVAL: 30000
    }
};

// ИСПРАВЛЕНО: Функция для проверки доступности сервера
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

// ИСПРАВЛЕНО: Функция для получения настроек роутинга с fallback
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

// НОВЫЙ: Функция для проверки доступности OpenRouteService
CONFIG.testOpenRouteService = async function() {
    try {
        const response = await fetch(`${CONFIG.ROUTING.BASE_URL}/driving-car/geojson`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json',
                'Authorization': CONFIG.ROUTING.API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [[8.681495, 49.41461], [8.687872, 49.420318]],
                format: 'geojson'
            })
        });
        
        if (response.ok) {
            console.log('✅ OpenRouteService доступен');
            return true;
        } else {
            console.warn('⚠️ OpenRouteService недоступен, статус:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка проверки OpenRouteService:', error);
        return false;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
