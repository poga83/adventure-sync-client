const CONFIG = {
    // ИСПРАВЛЕНО: Правильный URL для Render с HTTPS
    SERVER_URL: 'https://adventure-sync-server-d10jdvk9c44c73dp036g.onrender.com',
    
    FALLBACK_URLS: [
        'https://adventure-sync-server-d10jdvk9c44c73dp036g.onrender.com',
        'http://localhost:3000'
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
    
    ROUTING: {
        PROVIDER: 'openrouteservice',
        API_KEY: '5b3ce3597851110001cf6248a1b8ed27eb8a4e9b9e8bcf0f1cc1c715',
        BASE_URL: 'https://api.openrouteservice.org/v2/directions',
        GEOCODING_URL: 'https://api.openrouteservice.org/geocode',
        PROFILE: 'driving-car',
        FORMAT: 'geojson',
        FALLBACK_PROVIDER: 'osrm',
        FALLBACK_URL: 'https://router.project-osrm.org/route/v1',
        REQUEST_TIMEOUT: 15000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 2000
    },
    
    // ИСПРАВЛЕНО: Socket.IO для cross-origin между GitHub Pages и Render
    SOCKET: {
        TIMEOUT: 30000,
        RECONNECTION_ATTEMPTS: 10,
        RECONNECTION_DELAY: 3000,
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000,
        FORCE_NEW: false,
        UPGRADE: true,
        SECURE: true,
        WITH_CREDENTIALS: false, // GitHub Pages не поддерживает credentials
        TRANSPORTS: ['websocket', 'polling'],
        // Дополнительные опции для cross-origin
        EXTRA_HEADERS: {
            'Access-Control-Allow-Origin': '*'
        }
    },
    
    MARKER_CLUSTER: {
        CHUNKED_LOADING: true,
        SPIDERFY_ON_MAX_ZOOM: true,
        DISABLE_CLUSTERING_AT_ZOOM: 16,
        MAX_CLUSTER_RADIUS: 50
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

// ИСПРАВЛЕНО: Проверка сервера с учетом Render cold start
CONFIG.testServerConnection = async function() {
    for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
        try {
            console.log(`🔍 Проверка сервера: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                mode: 'cors',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                CONFIG.SERVER_URL = url;
                console.log(`✅ Сервер доступен: ${url}`, data);
                return true;
            }
        } catch (error) {
            console.warn(`⚠️ Сервер недоступен ${url}:`, error.message);
        }
    }
    return false;
};

// ИСПРАВЛЕНО: Активация Render сервера
CONFIG.testServerWithWakeup = async function() {
    console.log('🌅 Попытка активации Render сервера...');
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 секунд для Render
        
        const response = await fetch(`${CONFIG.SERVER_URL}/health`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            console.log('✅ Render сервер активирован');
            return true;
        }
    } catch (error) {
        console.warn('⏱️ Таймаут активации Render сервера:', error);
    }
    
    return false;
};

// ИСПРАВЛЕНО: Проверка OpenRouteService
CONFIG.testOpenRouteService = async function() {
    try {
        const testCoords = [[8.681495, 49.41461], [8.687872, 49.420318]];
        
        const response = await fetch(`${CONFIG.ROUTING.BASE_URL}/driving-car/geojson`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json',
                'Authorization': CONFIG.ROUTING.API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: testCoords,
                format: 'geojson'
            })
        });
        
        if (response.ok) {
            console.log('✅ OpenRouteService доступен');
            return true;
        } else if (response.status === 403) {
            console.warn('⚠️ OpenRouteService: превышена квота API');
            return false;
        } else {
            console.warn('⚠️ OpenRouteService недоступен, статус:', response.status);
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Ошибка проверки OpenRouteService:', error.message);
        return false;
    }
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
