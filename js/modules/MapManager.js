class MapManager {
  constructor(app) {
    this.app = app;
    this.map = null;
    this.userLocationMarker = null;
    this.watchId = null;
    this.markerPlacementMode = false;
    this.tempMarkers = [];
    this.mapInitialized = false;
  }

  initialize() {
    if (this.mapInitialized) return this.map;

    this.map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([55.7558, 37.6173], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.addCustomControls();
    this.requestUserLocation();
    this.setupMapEvents();
    this.mapInitialized = true;
    return this.map;
  }

  addCustomControls() {
    const zoomControl = L.control.zoom({ position: 'topright' }).addTo(this.map);

    const gpsControl = L.control({ position: 'topright' });
    gpsControl.onAdd = (map) => {
      const container = L.DomUtil.create('div', 'custom-control');
      container.innerHTML = `<button id="gpsBtn" title="Определить местоположение" class="control-btn"><i class="fas fa-crosshairs"></i></button>`;
      container.querySelector('#gpsBtn').onclick = () => this.centerOnUserLocation();
      return container;
    };
    gpsControl.addTo(this.map);

    const markerControl = L.control({ position: 'topright' });
    markerControl.onAdd = (map) => {
      const container = L.DomUtil.create('div', 'custom-control');
      container.innerHTML = `
        <button id="markerToggleBtn" title="Режим размещения маркеров" class="control-btn"><i class="fas fa-map-pin"></i></button>
        <button id="clearMarkersBtn" title="Очистить маркеры" class="control-btn"><i class="fas fa-trash"></i></button>
      `;
      container.querySelector('#markerToggleBtn').onclick = () => {
        this.toggleMarkerPlacementMode();
        container.querySelector('#markerToggleBtn').classList.toggle('active', this.markerPlacementMode);
      };
      container.querySelector('#clearMarkersBtn').onclick = () => this.clearTempMarkers();
      return container;
    };
    markerControl.addTo(this.map);
  }

  setupMapEvents() {
    this.map.on('click', (e) => {
      if (this.markerPlacementMode) this.addTempMarker(e.latlng);
    });
    this.map.on('locationfound', (e) => this.onLocationFound(e));
    this.map.on('locationerror', (e) => this.onLocationError(e));
  }

  requestUserLocation() {
    if ('geolocation' in navigator) {
      this.map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true, timeout: 10000 });
    } else {
      this.app.notificationManager.showNotification('Геолокация не поддерживается', 'error');
    }
  }

  onLocationFound(e) {
    const userPosition = [e.latlng.lat, e.latlng.lng];
    this.updateUserLocation(userPosition);
    this.startWatchingUserLocation();
    if (!this.userLocationMarker) {
      this.userLocationMarker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'user-marker current-user',
          html: '<i class="fas fa-user" style="color: #2196F3; font-size: 16px;"></i>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        }),
        zIndexOffset: 1000
      }).addTo(this.map);
      L.circle(e.latlng, { radius: e.accuracy, fillColor: '#2196F3', fillOpacity: 0.1, color: '#2196F3', weight: 1 }).addTo(this.map);
    }
    this.app.notificationManager.showNotification('Местоположение определено');
  }

  onLocationError(e) {
    this.app.notificationManager.showNotification('Не удалось определить местоположение. Используется позиция по умолчанию.', 'warning');
    this.updateUserLocation([55.7558, 37.6173]);
  }

  startWatchingUserLocation() {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.updateUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error('Ошибка отслеживания:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  }

  updateUserLocation(position) {
    if (this.app.connectionManager) this.app.connectionManager.updateUserPosition(position);
    if (this.userLocationMarker) this.userLocationMarker.setLatLng(position);
  }

  centerOnUserLocation() {
    if (this.userLocationMarker) {
      this.map.setView(this.userLocationMarker.getLatLng(), 16);
      this.app.notificationManager.showNotification('Карта центрирована на вашем местоположении');
    } else {
      this.requestUserLocation();
    }
  }

  toggleMarkerPlacementMode() {
    this.markerPlacementMode = !this.markerPlacementMode;
    this.map.getContainer().style.cursor = this.markerPlacementMode ? 'crosshair' : '';
    this.app.notificationManager.showNotification(this.markerPlacementMode ? 'Режим размещения маркеров включен' : 'Режим размещения маркеров выключен');
  }

  addTempMarker(latlng) {
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'temp-marker',
        html: '<i class="fas fa-map-pin" style="color: #ff6b6b; font-size: 16px;"></i>',
        iconSize: [25, 25],
        iconAnchor: [12, 25]
      })
    }).addTo(this.map);
    const markerId = L.Util.stamp(marker);
    marker.bindPopup(`
      <div class="user-popup">
        <h4>Временный маркер</h4>
        <div class="status">Lat: ${latlng.lat.toFixed(6)}<br>Lng: ${latlng.lng.toFixed(6)}</div>
        <button onclick="window.adventureSync.mapManager.removeMarker('${markerId}')" style="margin-top: 5px; padding: 5px 10px; background: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer;">Удалить</button>
        <button onclick="window.adventureSync.mapManager.createRouteToMarker('${markerId}')" style="margin-top: 5px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">Маршрут</button>
      </div>
    `);
    this.tempMarkers.push(marker);
    this.app.notificationManager.showNotification('Маркер добавлен');
  }

  removeMarker(markerId) {
    const idx = this.tempMarkers.findIndex(m => L.Util.stamp(m) == markerId);
    if (idx !== -1) {
      this.map.removeLayer(this.tempMarkers[idx]);
      this.tempMarkers.splice(idx, 1);
      this.app.notificationManager.showNotification('Маркер удален');
    }
  }

  clearTempMarkers() {
    this.tempMarkers.forEach(m => this.map.removeLayer(m));
    this.tempMarkers = [];
    this.app.notificationManager.showNotification('Все временные маркеры удалены');
  }

  createRouteToMarker(markerId) {
    const marker = this.tempMarkers.find(m => L.Util.stamp(m) == markerId);
    if (marker && this.userLocationMarker) {
      const from = this.userLocationMarker.getLatLng();
      const to = marker.getLatLng();
      this.app.routeManager.createRoute(from, to);
    }
  }

  createRouteToUser(userId) {
    const user = this.app.markerManager.getUser(userId);
    if (!user || !this.userLocationMarker) {
      this.app.notificationManager.showNotification(user ? 'Ваше местоположение не определено' : 'Пользователь не найден', 'error');
      return;
    }
    const from = this.userLocationMarker.getLatLng();
    const to = L.latLng(user.position[0], user.position[1]);
    this.app.routeManager.createRoute(from, to);
    this.app.notificationManager.showNotification(`Строим маршрут к ${user.name}`);
  }

  invalidateSize() {
    if (this.map) setTimeout(() => this.map.invalidateSize(), 100);
  }
}
