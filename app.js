let map, userMarker, socket;
const userMarkers = new Map();
const SERVER_URL = 'wss://adventure-sync-server.onrender.com';

// Инициализация карты
function initMap(coords = [55.751244, 37.618423]) {
    map = L.map('map-container').setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// Обработчик входа
function handleLogin() {
    const username = document.getElementById('username').value.trim();
    if (!username) return alert('Придумай крутой ник!');
    
    socket = io(SERVER_URL);
    
    socket.on('connect', () => {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        socket.emit('register', {
            name: username,
            status: document.getElementById('status-select').value
        });
    });

    // Слушатели событий
    socket.on('users', updateUserMarkers);
    socket.on('chat', handleNewMessage);
    socket.on('connect_error', handleConnectionError);
    
    initMap();
    startLocationTracking();
}

// Отслеживание геолокации
function startLocationTracking() {
    if (!navigator.geolocation) {
        alert('Геолокация не поддерживается 😢');
        return;
    }

    navigator.geolocation.watchPosition(
        position => {
            const coords = [position.coords.latitude, position.coords.longitude];
            socket.emit('position', coords);
        },
        error => {
            console.error('Ошибка геолокации:', error);
            alert('Разреши доступ к геолокации в настройках! 🔑');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Обновление маркеров
function updateUserMarkers(users) {
    users.forEach(user => {
        if (user.id === socket.id) {
            updateCurrentUserMarker(user);
        } else {
            updateOtherUserMarker(user);
        }
    });
}

// Остальные функции...
