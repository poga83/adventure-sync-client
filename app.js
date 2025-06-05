const socket = io('https://adventure-sync-server.onrender.com');
let map, userMarker;
const markers = new Map();

// Инициализация карты
function initMap(coords = [55.751244, 37.618423]) {
  map = L.map('map').setView(coords, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// Обновление маркеров
socket.on('users', (users) => {
  users.forEach(user => {
    if (user.id === socket.id) {
      if (!userMarker) {
        userMarker = L.marker(user.position, { 
          icon: L.divIcon({ html: user.status }) 
        }).addTo(map);
      } else {
        userMarker.setLatLng(user.position);
      }
    } else {
      if (!markers.has(user.id)) {
        markers.set(user.id, L.marker(user.position, {
          icon: L.divIcon({ html: user.status })
        }).addTo(map));
      } else {
        markers.get(user.id).setLatLng(user.position);
      }
    }
  });
});

// Геолокация
navigator.geolocation.watchPosition(
  pos => {
    const coords = [pos.coords.latitude, pos.coords.longitude];
    socket.emit('position', coords);
  },
  err => console.error('Ошибка геолокации:', err)
);
