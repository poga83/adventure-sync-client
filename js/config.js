const CONFIG = {
    // ИСПРАВЛЕНО: Используем 127.0.0.1 вместо localhost для избежания проблем с IPv6
    SERVER_URL: 'http://127.0.0.1:3000',
    
    // Альтернативные URL для проверки подключения
    FALLBACK_URLS: [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    
    MAP: {
        DEFAULT_CENTER: [55.7558, 37.6173], // Москва
        DEFAULT_ZOOM: 10,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        
        // Настройки для отладки карты
        DEBUG_MODE: false, // Включить для отладки проблем с картой
        FORCE_CANVAS: true, // Принудительное использование Canvas для лучшей производительности
        MIN_ZOOM: 2,
        MAX_ZOOM: 18
    },
    
    MARKER_CLUSTER: {
        CHUNKED_LOADING: true,
        SPIDERFY_ON_MAX_ZOOM: true,
        DISABLE_CLUSTERING_AT_ZOOM: 16,
        MAX_CLUSTER_RADIUS: 50,
        ZOOM_TO_BOUNDS_ON_CLICK: true,
        SHOW_COVERAGE_ON_HOVER: false
    },
    
    // ИСПРАВЛЕНО: Новые статусы
    STATUSES: {
        AUTO: 'auto',
        MOTO: 'moto', 
        WALKING: 'walking',
        BUSY: 'busy'
    },
    
    CACHE: {
        POSITIONS_KEY: 'adventure_sync_positions',
        MESSAGES_KEY: 'adventure_sync_messages',
        USER_KEY: 'adventure_sync_user'
    },
    
    // Настройки Socket.IO
    SOCKET: {
        TIMEOUT: 10000,
        RECONNECTION_ATTEMPTS: 5,
        RECONNECTION_DELAY: 1000,
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000
    },
    
    // Настройки интерфейса
    UI: {
        NOTIFICATION_TIMEOUT: 5000,
        MAP_INVALIDATE_DELAY: 200,
        SIDEBAR_ANIMATION_DURATION: 300
    }
};

// Функция для проверки доступности сервера
CONFIG.testServerConnection = async function() {
    for (const url of [CONFIG.SERVER_URL, ...CONFIG.FALLBACK_URLS]) {
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                timeout: 5000
            });
            if (response.ok) {
                CONFIG.SERVER_URL = url;
                return true;
            }
        } catch (error) {
            console.warn(`Сервер недоступен по адресу ${url}:`, error.message);
        }
    }
    return false;
};

// Функция для получения оптимальных настроек карты
CONFIG.getMapOptions = function() {
    return {
        preferCanvas: CONFIG.MAP.FORCE_CANVAS,
        zoomControl: false,
        attributionControl: true,
        minZoom: CONFIG.MAP.MIN_ZOOM,
        maxZoom: CONFIG.MAP.MAX_ZOOM
    };
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
